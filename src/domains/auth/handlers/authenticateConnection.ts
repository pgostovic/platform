import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import { authenticateConnection } from '../AuthApi';
import Session from '../model/Session';

const authenticateConnection: authenticateConnection = async ({ connectionId: auxId }) => {
  const session = await search(Session, { auxId }).first();
  if (session && session.expiry.getTime() > Date.now()) {
    return { valid: session && session.expiry.getTime() > Date.now() };
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticateConnection;