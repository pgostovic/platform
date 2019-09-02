import { field, Model } from '@phnq/model';

export const AUTH_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes

class Account extends Model {
  @field public readonly email: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public password?: string;
  @field public authCode?: {
    code: string;
    expiry: Date;
  };
  @field public requirePasswordChange = true;

  public constructor(email: string) {
    super();
    this.email = email;
  }
}

export default Account;
