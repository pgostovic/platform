import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import DomainServiceContext from '../../../DomainServiceContext';
import { createSession } from '../AuthApi';
import Account from '../model/Account';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';

const createSession: createSession = async ({ email, password }) => {
  const context = DomainServiceContext.get();
  const account = await search(Account, { email }).first();
  const connectionId = context.getConnectionId();
  if (!connectionId) {
    throw new Anomaly('Invalid Context');
  }

  if (account && account.password && (await bcrypt.compare(password, account.password))) {
    const session = await new Session(
      account.id,
      new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY),
      connectionId,
    ).save();

    context.broadcast('connected', { accountId: session.accountId });

    return { token: session.token, authStatus: account.authStatus };
  }
  throw new Anomaly('Invalid Credentials');
};

export default createSession;
