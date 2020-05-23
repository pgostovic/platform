import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { ModelData } from '@phnq/model';

import Account from '../domains/auth/model/account';
import DomainService from '../DomainService';
import jobFactory from './jobFactory';
import uuid = require('uuid');

export const JOB_KEY = uuid().replace(/[^\w]/g, '');

export interface JobDescripton extends ModelData {
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
    const Job = this.getJobClass();
    const job = await new Job(account.id, type, info, jobDesc.runTime || now).save();
    this.log('Scheduled job %s -- %s', type, job.id);

    if (job.nextRunTime <= now) {
      this.runReadyJobs();
    } else {
      this.scheduleNextJobsRun();
    }
  }

  private getJobClass(): any {
    const datastore = this.service.getDataStore();
    if (!datastore) {
      throw new Error(`Domain "${this.service.getDomain()}" does not have a datastore configured.`);
    }

    return jobFactory(datastore);
  }

  private async scheduleNextJobsRun(): Promise<void> {
    if (this.nextJobRunTimeout) {
      clearTimeout(this.nextJobRunTimeout);
    }

    const Job = this.getJobClass();
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

    const Job = this.getJobClass();
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
