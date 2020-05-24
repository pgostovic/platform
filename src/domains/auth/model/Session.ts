import { datastore, field, find, Model, ModelId } from '@phnq/model';
import uuid from 'uuid/v4';

import AuthService from '../AuthService';
import Account from './account';

export const AUTH_CODE_SESSION_EXPIRY = 10 * 60 * 1000; // 10 minutes
export const CREDENTIALS_SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

@datastore(AuthService.datastore)
class Session extends Model {
  @field public readonly accountId: ModelId;
  @field public readonly token = uuid();
  @field public auxId: string; // This is the websocket connectionId
  @field public expiry: Date;

  public constructor(accountId: ModelId, expiry: Date, auxId: string) {
    super();
    this.accountId = accountId;
    this.expiry = expiry;
    this.auxId = auxId;
  }

  public get account(): Promise<Account> {
    return find(Account, this.accountId) as Promise<Account>;
  }
}

export default Session;
