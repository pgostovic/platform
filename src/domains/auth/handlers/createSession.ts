import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';
import bcrypt from 'bcrypt';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { createSession } from '../AuthApi';
import Account from '../model/account';
import Session, { CREDENTIALS_SESSION_EXPIRY } from '../model/Session';

const createSession: createSession = async ({ email, password }, context?: DomainServiceHandlerContext) => {
  const account = await search(Account, { email }).first();

  if (account && account.password && (await bcrypt.compare(password, account.password))) {
    const session = await new Session(
      account.id as string,
      new Date(Date.now() + CREDENTIALS_SESSION_EXPIRY),
      context!.getConnectionId(),
    ).save();
    return { token: session.token, authStatus: account.authStatus };
  }
  throw new Anomaly('Invalid Credentials');
};

export default createSession;
