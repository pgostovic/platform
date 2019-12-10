import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import DomainServiceContext from '../../../DomainServiceContext';
import { setPassword } from '../AuthApi';
import { AUTH_CODE_EXPIRY } from '../model/account';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';
import authenticateConnection from './authenticateConnection';

const setPassword: setPassword = async ({ password }) => {
  const context = DomainServiceContext.get();
  await authenticateConnection();

  const session = await search(Session, { auxId: context.getConnectionId() }).first();
  if (session) {
    const account = await session.account;
    account.password = await bcrypt.hash(password, 5);
    account.authStatus.requirePasswordChange = false;
    await account.save();

    if (session.expiry.getTime() - Date.now() < AUTH_CODE_EXPIRY) {
      session.expiry = new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY);
      await session.save();
    }

    return account.authStatus;
  }
  throw new Anomaly('No current session');
};

export default setPassword;
