import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import authenticate from '../../../auth/authenticate';
import DomainServiceContext from '../../../DomainServiceContext';
import { setPassword } from '../AuthApi';
import { AUTH_CODE_EXPIRY } from '../model/Account';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';

const setPassword: setPassword = async ({ password }) => {
  const session = await search(Session, { auxId: DomainServiceContext.get().getConnectionId() }).first();
  if (session) {
    let account = await session.account;
    account.password = await bcrypt.hash(password, 5);
    account.authStatus.requirePasswordChange = false;
    account = await account.save();

    if (session.expiry.getTime() - Date.now() < AUTH_CODE_EXPIRY) {
      session.expiry = new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY);
      await session.save();
    }

    return account.authStatus;
  }
  throw new Anomaly('No current session');
};

export default authenticate(setPassword);
