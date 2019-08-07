import { createSessionWithCode } from '../AuthApi';

const createSession: createSessionWithCode = async params => {
  console.log('createSessionWithCode', params);
  return { token: 'abcd1234' };
};

export default createSession;

// import { Anomaly } from '@phnq/message';
// import { search } from '@phnq/model';
// import uuid from 'uuid/v4';
// import Account from '../../model/account';
// import { ICreateSessionResult, ICreateSessionWithCodeParams } from '../../model/api';
// import Session, { AUTH_CODE_SESSION_EXPIRY } from '../../model/session';
// import Connection from '../connection';
// import Service from '../service';

// const createSessionWithCode = async (
//   p: ICreateSessionWithCodeParams,
//   conn: Connection,
// ): Promise<ICreateSessionResult> => {
//   const { authCode: code } = p;

//   const account = (await search(Account, { 'authCode.code': code }))[0];

//   if (account) {
//     const authCodeExpiry = account.authCode ? account.authCode.expiry : undefined;
//     if (authCodeExpiry && Date.now() > authCodeExpiry.getTime()) {
//       throw new Anomaly('Invalid or expired code');
//     }

//     conn.account = account;

//     const expiry = new Date(Date.now() + AUTH_CODE_SESSION_EXPIRY);

//     const session = await new Session({
//       accountId: account.id,
//       expiry,
//       token: uuid(),
//     }).save();

//     conn.session = session;

//     return { token: session.token, requires: account.requires };
//   }
//   throw new Anomaly('Invalid or expired code');
// };

// export default createSessionWithCode as Service;
