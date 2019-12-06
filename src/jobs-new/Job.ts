import { Value } from '@phnq/message';
import { field, Model, ModelId, search } from '@phnq/model';
import Cursor from '@phnq/model/Cursor';

class Job extends Model {
  public static jobsReadyToRun(): Cursor<Job> {
    return search(Job, { nextRunTime: { $lte: new Date() }, lastRunTime: { $exists: false } });
  }

  @field public readonly accountId: ModelId;
  @field public readonly data: Value;
  @field public nextRunTime: Date;
  @field public lastRunTime?: Date;

  public constructor(accountId: ModelId, data: Value, nextRunTime: Date) {
    super();
    this.accountId = accountId;
    this.data = data;
    this.nextRunTime = nextRunTime;
  }
}

export default Job;
