import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import DomainServiceContext from '../../../DomainServiceContext';
import { createSessionWithCode } from '../AuthApi';
import Account from '../model/account';
import Session, { AUTH_CODE_SESSION_EXPIRY } from '../model/Session';

const createSession: createSessionWithCode = async ({ code }) => {
  const context = DomainServiceContext.get();
  const account = await search(Account, { 'authCode.code': code }).first();
  const connectionId = context.getConnectionId();
  if (!connectionId) {
    throw new Anomaly('Invalid Context');
  }

  if (account) {
    const authCodeExpiry = account.authCode ? account.authCode.expiry : undefined;
    if (authCodeExpiry && Date.now() > authCodeExpiry.getTime()) {
      throw new Anomaly('Invalid or expired code');
    }

    const session = new Session(account.id as string, new Date(Date.now() + AUTH_CODE_SESSION_EXPIRY), connectionId);
    await session.save();

    return { token: session.token, authStatus: account.authStatus };
  }

  throw new Anomaly('Invalid or expired code');
};

export default createSession;
