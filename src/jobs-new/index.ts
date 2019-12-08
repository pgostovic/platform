import { createLogger } from '@phnq/log';
import { HasId } from '@phnq/model';

import Account from '../domains/auth/model/account';
import DomainService from '../DomainService';
import { DomainServiceMessage, JobDescripton } from '../types';
import Job from './Job';

const log = createLogger('jobs');

class Jobs {
  private service: DomainService;

  public constructor(service: DomainService) {
    this.service = service;
  }

  public async start(): Promise<void> {
    log('Starting jobs for service %s', this.service.getDomain());

    // start some prcocess to query for upcoming jobs and run them
    // - grab a job and lock it so it's not run multiple times
    // - update job's status for the various states - i.e. started, failed, succeeded, etc.
    // - save the time the job ran at.
    // - call this.service.executeJobWithData() to actually run the job
    // console.log('start', this.service);

    setInterval(async () => {
      log('Find jobs to run...');
      for await (const job of Job.jobsReadyToRun().iterator) {
        log('Running job: %s', job.id);
        await this.service.executeJob(job.data as DomainServiceMessage, job.accountId);
        job.lastRunTime = new Date();
        await job.save();
        log('Finished job: %s', job.id);
      }
    }, 10000);
  }

  public async schedule(
    jobDesc: JobDescripton,
    domainMessage: DomainServiceMessage,
    account: Account & HasId,
  ): Promise<void> {
    const job = new Job(account.id, domainMessage, jobDesc.runTime);
    await job.save();
    log('Scheduled job %s -- %s', domainMessage.type, job.id);
  }
}

export default Jobs;
