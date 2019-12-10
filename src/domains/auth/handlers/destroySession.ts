import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import DomainServiceContext from '../../../DomainServiceContext';
import { destroySession } from '../AuthApi';
import Session from '../model/Session';

const destroySession: destroySession = async () => {
  const context = DomainServiceContext.get();
  const session = await search(Session, { auxId: context.getConnectionId() }).first();
  if (session) {
    session.expiry = new Date();
    await session.save();
    return { destroyed: true };
  }
  throw new Anomaly('No current session');
};

export default destroySession;
