import { field, HasId, Model, ModelId, search } from '@phnq/model';
import Cursor from '@phnq/model/Cursor';

class Job extends Model {
  public static jobsReadyToRun(): Cursor<Job> {
    return search(Job, { nextRunTime: { $lte: new Date() }, lastRunTime: { $exists: false } });
  }

  public static async nextJob(): Promise<(Job & HasId) | undefined> {
    return search(Job, { lastRunTime: { $exists: false } }, { sort: [['nextRunTime']], limit: 1 }).first();
  }

  @field public readonly accountId: ModelId;
  @field public readonly type: string;
  @field public readonly info: unknown;
  @field public nextRunTime: Date;
  @field public lastRunTime?: Date;

  public constructor(accountId: ModelId, type: string, info: unknown, nextRunTime: Date) {
    super();
    this.accountId = accountId;
    this.type = type;
    this.info = info;
    this.nextRunTime = nextRunTime;
  }
}

export default Job;
