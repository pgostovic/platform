import Agenda from 'agenda';
import { promises as fs } from 'fs';
import path from 'path';

import { DomainServiceApi } from '../types';

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

  await Promise.all(
    [
      ...new Set(
        (await fs.readdir(jobsPath))
          .map((name): string => path.basename(name).replace(/\.(d\.ts|js|ts)$/, ''))
          .filter(name => name !== 'index'),
      ),
    ].map(async name => {
      const jobFn = (await import(`./${name}`)).default;
      agenda!.define(name, async job => {
        jobFn(job.attrs.data, clients);
      });
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
