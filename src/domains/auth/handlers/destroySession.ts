import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import { destroySession } from '../AuthApi';
import Session from '../model/Session';

const destroySession: destroySession = async (_?: undefined, connectionId?: string) => {
  const session = await search(Session, { auxId: connectionId }).first();
  if (session) {
    session.expiry = new Date();
    await session.save();
    return { destroyed: false };
  }
  throw new Anomaly('No current session');
};

export default destroySession;
