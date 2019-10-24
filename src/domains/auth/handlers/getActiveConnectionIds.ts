import { search } from '@phnq/model';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { getActiveConnectionIds } from '../AuthApi';
import Session from '../model/Session';
import authenticateConnection from './authenticateConnection';

const getActiveConnectionIds: getActiveConnectionIds = async ({ accountId }, context?: DomainServiceHandlerContext) => {
  const { accountId: currentAccountId } = await authenticateConnection(undefined, context);

  const sessionsCursor = search(Session, { accountId: accountId || currentAccountId, expiry: { $gt: new Date() } });

  const connectionIds: string[] = [];
  for await (const session of sessionsCursor.iterator) {
    connectionIds.push(session.auxId);
  }

  return connectionIds;
};

export default getActiveConnectionIds;
