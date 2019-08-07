import { field, find, Model } from '@phnq/model';
import Account from './account';

export const AUTH_CODE_SESSION_EXPIRY = 10 * 60 * 1000; // 10 minutes
export const CREDENTIALS_SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

class Session extends Model {
  @field public token?: string;
  @field public accountId?: string;
  @field public expiry?: Date;

  public get account(): Promise<Account> {
    return find(Account, this.accountId) as Promise<Account>;
  }
}

export default Session;
