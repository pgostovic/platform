import { destroySession } from '../AuthApi';

const destroySession: destroySession = async () => {
  console.log('destroySession');
  return { destroyed: false };
};

export default destroySession;

// import { Anomaly } from '@phnq/message';
// import { IDestroySessionResult } from '../../model/api';
// import Session from '../../model/session';
// import Connection from '../connection';

// const destroySession = async (_: null, conn: Connection): Promise<IDestroySessionResult> => {
//   if (conn.session) {
//     await new Session({
//       ...conn.session,
//       expiry: new Date(),
//     }).save();
//     return { destroyed: true };
//   }
//   throw new Anomaly('No current session');
// };

// export default destroySession;
