import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async ({ token }, connectionId?: string) => {
  const session = await search(Session, { token }).first();
  if (session && session.expiry.getTime() > Date.now()) {
    if (session.auxId !== connectionId && connectionId) {
      session.auxId = connectionId;
      await session.save();
    }
    return (await session.account).authStatus;
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticate;
