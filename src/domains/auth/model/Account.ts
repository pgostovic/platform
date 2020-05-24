import { datastore, field, Model } from '@phnq/model';

import { AuthStatus } from '../../../types';
import AuthService from '../AuthService';

export const AUTH_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes

@datastore(AuthService.datastore)
class Account extends Model {
  @field public readonly email: string;
  @field public password?: string;
  @field public authCode?: {
    code: string;
    expiry: Date;
  };
  @field public authStatus: AuthStatus = {
    requirePasswordChange: true,
  };

  public constructor(email: string) {
    super();
    this.email = email;
  }
}

export default Account;
