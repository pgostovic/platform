import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { Data } from '@phnq/model';

import Account from '../domains/auth/model/account';
import DomainService from '../DomainService';
import Job from './Job';
import uuid = require('uuid');

export const JOB_KEY = uuid().replace(/[^\w]/g, '');

export interface JobDescripton extends Data {
  runTime?: Date;
}

class Jobs {
  private service: DomainService;
  private log: Logger;
  private nextJobRunTimeout?: NodeJS.Timeout;

  public constructor(service: DomainService) {
    this.service = service;
    this.log = createLogger(`jobs.${this.service.getDomain()}`);
  }

  public async start(): Promise<void> {
    this.log('Starting jobs for service %s', this.service.getDomain());
    this.runReadyJobs();
  }

  public async schedule(jobDesc: JobDescripton, type: string, info: unknown, account: Account): Promise<void> {
    const now = new Date();
    const job = await new Job(account.id, type, info, jobDesc.runTime || now).save();
    this.log('Scheduled job %s -- %s', type, job.id);

    if (job.nextRunTime <= now) {
      this.runReadyJobs();
    } else {
      this.scheduleNextJobsRun();
    }
  }

  private async scheduleNextJobsRun(): Promise<void> {
    if (this.nextJobRunTimeout) {
      clearTimeout(this.nextJobRunTimeout);
    }

    const nextJob = await Job.nextJob();
    if (nextJob) {
      this.log('Next job: %s at %s', nextJob.type, nextJob.nextRunTime.toISOString());
      this.nextJobRunTimeout = setTimeout(() => {
        this.nextJobRunTimeout = undefined;
        this.runReadyJobs();
      }, nextJob.nextRunTime.getTime() - Date.now());
    }
  }

  private async runReadyJobs(): Promise<void> {
    if (this.nextJobRunTimeout) {
      clearTimeout(this.nextJobRunTimeout);
    }

    try {
      for await (const job of Job.jobsReadyToRun().iterator) {
        this.log('Running job: %s', job.id);
        try {
          await this.service.executeJob(job.type, job.info, job.accountId);
        } catch (err) {
          job.error = err.message;
        }
        job.lastRunTime = new Date();
        const savedJob = await job.save();
        this.log('Finished job: %s', savedJob.id);
      }
    } finally {
      this.scheduleNextJobsRun();
    }
  }
}

export default Jobs;
