import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import { createSessionWithCode } from '../AuthApi';
import Account from '../model/account';
import Session, { AUTH_CODE_SESSION_EXPIRY } from '../model/Session';

const createSession: createSessionWithCode = async ({ code }, connectionId?: string) => {
  const account = await search(Account, { 'authCode.code': code }).first();
  if (account) {
    const authCodeExpiry = account.authCode ? account.authCode.expiry : undefined;
    if (authCodeExpiry && Date.now() > authCodeExpiry.getTime()) {
      throw new Anomaly('Invalid or expired code');
    }

    const session = new Session(
      connectionId as string,
      account.id as string,
      new Date(Date.now() + AUTH_CODE_SESSION_EXPIRY),
    );
    await session.save();

    return { token: session.token };
  }

  throw new Anomaly('Invalid or expired code');
};

export default createSession;
