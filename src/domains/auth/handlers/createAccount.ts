import { createLogger } from '@phnq/log';
import { Anomaly } from '@phnq/message';
import cryptoRandomString from 'crypto-random-string';
import isEmail from 'validator/lib/isEmail';

import { createAccount } from '../AuthApi';
import Account, { AUTH_CODE_EXPIRY } from '../model/account';

const log = createLogger('createAccount');

const createAccount: createAccount = async ({ email }) => {
  if (!isEmail(email)) {
    throw new Anomaly('Invalid email address');
  }

  let account = new Account(email);
  account.authCode = {
    code: cryptoRandomString({ length: 10, type: 'url-safe' }),
    expiry: new Date(Date.now() + AUTH_CODE_EXPIRY),
  };

  log('Auth code path: /code/%s', account.authCode.code);

  account = await account.save();

  return account.authStatus;
};

export default createAccount;
