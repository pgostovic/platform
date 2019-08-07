import { field, Model, ModelParams } from '@phnq/model';

export interface IAccountRequireFlags {
  passwordChange: boolean;
}

class Account extends Model<Account> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public password?: string;
  @field public authCode?: {
    code: string;
    expiry: Date;
  };
  @field public requires?: IAccountRequireFlags;

  constructor(data: ModelParams<Account>) {
    super({ requires: { passwordChange: false }, ...data });
  }
}

export default Account;
