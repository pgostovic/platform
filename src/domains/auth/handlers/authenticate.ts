import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import DomainServiceContext from '../../../DomainServiceContext';
import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async ({ token }) => {
  const context = DomainServiceContext.get();
  let session = await search(Session, { token }).first();
  if (session && session.expiry.getTime() > Date.now()) {
    const connectionId = context.getConnectionId();
    if (session.auxId !== connectionId && connectionId) {
      session.auxId = connectionId;
      session = await session.save();

      context.broadcast('connected', { accountId: session.accountId });
    }
    return (await session.account).authStatus;
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticate;
