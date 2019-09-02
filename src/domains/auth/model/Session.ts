import { field, find, Model, ModelId } from '@phnq/model';
import uuid from 'uuid/v4';

import Account from './account';

export const AUTH_CODE_SESSION_EXPIRY = 10 * 60 * 1000; // 10 minutes
export const CREDENTIALS_SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

class Session extends Model {
  @field public readonly auxId: string;
  @field public readonly accountId: ModelId;
  @field public readonly token = uuid();
  @field public expiry: Date;

  public constructor(auxId: string, accountId: ModelId, expiry: Date) {
    super();
    this.auxId = auxId;
    this.accountId = accountId;
    this.expiry = expiry;
  }

  public get account(): Promise<Account> {
    return find(Account, this.accountId) as Promise<Account>;
  }
}

export default Session;
