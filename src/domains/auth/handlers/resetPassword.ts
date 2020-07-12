import { createLogger } from '@phnq/log';
import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import cryptoRandomString from 'crypto-random-string';
import isEmail from 'validator/lib/isEmail';

import { resetPassword } from '../AuthApi';
import Account, { AUTH_CODE_EXPIRY } from '../model/Account';

const log = createLogger('resetPassword');

const resetPassword: resetPassword = async ({ email }) => {
  if (!isEmail(email)) {
    throw new Anomaly('Invalid email address');
  }

  const account = await search(Account, { email }).first();
  if (account) {
    account.authCode = {
      code: cryptoRandomString({ length: 10, type: 'url-safe' }),
      expiry: new Date(Date.now() + AUTH_CODE_EXPIRY),
    };
    await account.save();

    log('Reset password path: /code/%s/set-password', account.authCode.code);
  }

  return { requested: true };
};

export default resetPassword;
