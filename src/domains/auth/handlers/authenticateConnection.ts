/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Anomaly } from '@phnq/message';
import { search } from '@phnq/model';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { authenticateConnection } from '../AuthApi';
import Session from '../model/Session';

const authenticateConnection: authenticateConnection = async (_?, context?: DomainServiceHandlerContext) => {
  const session = await search(Session, { auxId: context!.getConnectionId() }).first();
  if (session && session.expiry.getTime() > Date.now()) {
    return { valid: session && session.expiry.getTime() > Date.now(), accountId: session.accountId };
  }
  throw new Anomaly('Not Authenticated');
};

export default authenticateConnection;
