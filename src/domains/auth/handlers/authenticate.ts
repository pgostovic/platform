import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async ({ token }, connectionId?: string) => {
  const session = await search(Session, { auxId: connectionId }).first();
  if (session && session.token === token && session.expiry.getTime() > Date.now()) {
    return (await session.account).authStatus;
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticate;
