import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import { setPassword } from '../AuthApi';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';

const setPassword: setPassword = async ({ password }, connectionId?: string) => {
  const session = await search(Session, { auxId: connectionId }).first();
  if (session) {
    const account = await session.account;
    account.password = await bcrypt.hash(password, 5);
    account.authStatus.requirePasswordChange = false;
    await account.save();

    session.expiry = new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY);
    await session.save();
    return account.authStatus;
  }
  throw new Anomaly('No current session');
};

export default setPassword;
