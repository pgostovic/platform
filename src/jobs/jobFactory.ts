import { datastore, field, Model, ModelId, search } from '@phnq/model';
import Cursor from '@phnq/model/Cursor';
import { DataStore } from '@phnq/model/Datastore';

const jobClasses = new Map<DataStore, any>();

export default (ds: DataStore) => {
  if (jobClasses.has(ds)) {
    return jobClasses.get(ds);
  }

  @datastore(ds)
  class Job extends Model {
    public static jobsReadyToRun(): Cursor<Job> {
      return search(Job, { nextRunTime: { $lte: new Date() }, lastRunTime: { $exists: false } });
    }

    public static async nextJob(): Promise<Job | undefined> {
      return search(Job, { lastRunTime: { $exists: false } }, { sort: ['nextRunTime'], limit: 1 }).first();
    }

    @field public readonly accountId: ModelId;
    @field public readonly type: string;
    @field public readonly info: unknown;
    @field public nextRunTime: Date;
    @field public lastRunTime?: Date;
    @field public error?: string;

    public constructor(accountId: ModelId, type: string, info: unknown, nextRunTime: Date) {
      super();
      this.accountId = accountId;
      this.type = type;
      this.info = info;
      this.nextRunTime = nextRunTime;
    }
  }

  jobClasses.set(ds, Job);

  return jobClasses.get(ds);
};
