import { setPassword } from '../AuthApi';

const setPassword: setPassword = async params => {
  console.log('setPassword', params);
  return { passwordSet: true };
};

export default setPassword;

// import bcrypt from 'bcrypt';
// import { ISetPasswordParams, ISetPasswordResult } from '../../model/api';
// import Session, { CREDENTIALS_SESSION_EXPIRY } from '../../model/session';
// import Connection from '../connection';
// import Service from '../service';

// const setPassword = async (p: ISetPasswordParams, conn: Connection): Promise<ISetPasswordResult> => {
//   if (conn.account) {
//     conn.account.password = await bcrypt.hash(p.password, 5);
//     conn.account.requires = {
//       ...conn.account.requires,
//       passwordChange: false,
//     };
//     conn.account.save();

//     await new Session({
//       ...conn.session,
//       expiry: new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY),
//     }).save();
//     return { passwordSet: true, requires: conn.account.requires };
//   }
//   return { passwordSet: false };
// };

// export default setPassword as Service;
