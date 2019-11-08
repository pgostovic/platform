import { createLogger } from '@phnq/log';
import Agenda from 'agenda';
import { promises as fs } from 'fs';
import path from 'path';

import { DomainServiceApi } from '../types';

const log = createLogger('jobs');

let agenda: Agenda | undefined = undefined;

interface Config {
  mongodbUri: string;
  jobsPath: string;
  apiClients: Map<string, DomainServiceApi>;
}

export const initJobs = async ({ mongodbUri, apiClients, jobsPath }: Config): Promise<void> => {
  agenda = new Agenda({ db: { address: mongodbUri, collection: 'jobs' } });

  const clients: { [key: string]: DomainServiceApi } = {};
  for (const entry of apiClients.entries()) {
    clients[entry[0]] = entry[1];
  }

  log('jobs path: %O', jobsPath);

  await Promise.all(
    [
      ...new Set(
        (await fs.readdir(jobsPath))
          .map((name): string => path.basename(name).replace(/\.(d\.ts|js|ts)$/, ''))
          .filter(name => name !== 'index'),
      ),
    ].map(async name => {
      let relJobsPath = path.relative(__dirname, jobsPath);
      if (relJobsPath[0] !== '.') {
        relJobsPath = `./${relJobsPath}`;
      }

      try {
        const jobFn = (await import(`${relJobsPath}/${name}`)).default;
        agenda!.define(name, async job => {
          jobFn(job.attrs.data, clients);
        });
        log('Registered job handler: %s', name);
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
          log.warn('Not a valid handler: %s', `${relJobsPath}/${name}`);
        }
      }
    }),
  );

  await agenda.start();
};

// This proxy just forwards all calls to the agenda instance. It's only
// needed because of the order of dependency loading.
const agendaProxy = new Proxy<Agenda>(new Agenda(), {
  get: (_: unknown, key: string): unknown => ((agenda! as unknown) as { [key: string]: unknown })[key],
});

export default agendaProxy;
