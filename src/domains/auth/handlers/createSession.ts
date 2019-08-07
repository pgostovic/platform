import { createSession } from '../AuthApi';

const createSession: createSession = async params => {
  console.log('createSession', params);
  return { token: 'abcd1234' };
};

export default createSession;

// import { Anomaly } from '@phnq/message';
// import { search } from '@phnq/model';
// import bcrypt from 'bcrypt';
// import uuid from 'uuid/v4';
// import Account from '../../model/account';
// import { ICreateSessionParams, ICreateSessionResult } from '../../model/api';
// import Session, { CREDENTIALS_SESSION_EXPIRY } from '../../model/session';
// import Connection from '../connection';
// import Service from '../service';

// const createSession = async (p: ICreateSessionParams, conn: Connection): Promise<ICreateSessionResult> => {
//   const { email, password } = p;

//   const account = (await search(Account, { email }))[0];

//   if (account && account.password && (await bcrypt.compare(password, account.password))) {
//     conn.account = account;

//     const expiry = new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY);

//     const session = await new Session({
//       accountId: account.id,
//       expiry,
//       token: uuid(),
//     }).save();

//     conn.session = session;

//     return { token: session.token, requires: account.requires };
//   }
//   throw new Anomaly(conn.i18n('services.createSession.invalidCredentials'));
// };

// export default createSession as Service;
