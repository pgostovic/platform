import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import { createSession } from '../AuthApi';
import Account from '../model/account';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';

const createSession: createSession = async ({ email, password }, connectionId?: string) => {
  const account = await search(Account, { email }).first();

  if (account && account.password && (await bcrypt.compare(password, account.password))) {
    const session = await new Session(
      connectionId as string,
      account.id as string,
      new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY),
    ).save();
    return { token: session.token };
  }
  throw new Anomaly('Invalid Credentials');
};

export default createSession;
