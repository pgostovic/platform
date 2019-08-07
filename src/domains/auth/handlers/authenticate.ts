// import { Anomaly } from '@phnq/message';
import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async (params, connectionId?: string) => {
  if (Date.now() !== 0) {
    throw new Anomaly('CHEESE AND CRACKERS');
  }

  console.log('connectionId', connectionId);
  const session = (await search(Session, { token: params.token }))[0];
  if (session) {
    return { authenticated: true };
  }

  return { authenticated: false };
};

export default authenticate;

// import { search } from '@phnq/model';
// import { IAuthenticateParams, IAuthenticateResult } from '../../model/api';
// import Session from '../../model/session';
// import Connection from '../connection';
// import Service from '../service';

// const authenticate = async (p: IAuthenticateParams, conn: Connection): Promise<IAuthenticateResult> => {
//   const account = conn.account;

//   if (!account) {
//     const sessions = await search(Session, { token: p.token });
//     if (sessions.length === 1) {
//       conn.session = sessions[0];
//       conn.account = await sessions[0].account;
//       try {
//         conn.validateSession();
//       } catch (err) {
//         if (err.data.code === 'expired-session') {
//           return { authenticated: false };
//         }
//       }
//     }
//   }

//   if (conn.account) {
//     return { authenticated: true, requires: conn.account.requires };
//   } else {
//     return { authenticated: false };
//   }
// };

// export default authenticate as Service;
