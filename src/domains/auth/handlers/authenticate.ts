import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async ({ token }, context?: DomainServiceHandlerContext) => {
  const session = await search(Session, { token }).first();
  if (session && session.expiry.getTime() > Date.now()) {
    const connectionId = context!.getConnectionId();
    if (session.auxId !== connectionId && connectionId) {
      session.auxId = connectionId;
      await session.save();
    }
    return (await session.account).authStatus;
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticate;
