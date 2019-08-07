import { createAccount } from '../AuthApi';

const createAccount: createAccount = async params => {
  console.log('createAccount', params);
  return { created: false };
};

export default createAccount;

// import { createLogger } from '@phnq/log';
// import { Anomaly } from '@phnq/message';
// import cryptoRandomString from 'crypto-random-string';
// import isEmail from 'validator/lib/isEmail';
// import Account from '../../model/account';
// import { ICreateAccountParams, ICreateAccountResult } from '../../model/api';
// import Connection from '../connection';
// import Service from '../service';

// const log = createLogger('createUAccount');

// const createAccount = async (p: ICreateAccountParams, conn: Connection): Promise<ICreateAccountResult> => {
//   if (!isEmail(p.email)) {
//     throw new Anomaly(conn.i18n('services.createAccount.invalidEmailAddress'));
//   }

//   const account = await new Account({
//     authCode: {
//       code: cryptoRandomString(10),
//       expiry: new Date(Date.now() + 5 * 60 * 1000),
//     },
//     email: p.email,
//     requires: {
//       passwordChange: true,
//     },
//   }).save();

//   if (account.authCode) {
//     log(`CREATED ACCOUNT - authCode url:\n\thttp://localhost:7777/code/${account.authCode.code}`);
//   }

//   if (!account.requires) {
//     throw new Error();
//   }

//   return { requires: account.requires };
// };

// export default createAccount as Service;
