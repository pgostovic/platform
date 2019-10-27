import { search } from '@phnq/model';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { getActiveConnectionIds } from '../AuthApi';
import Session from '../model/Session';
import authenticateConnection from './authenticateConnection';

// TODO: This should only be callable from within backend -- i.e. should not be able to call this from client
const getActiveConnectionIds: getActiveConnectionIds = async ({ accountId }, context?: DomainServiceHandlerContext) => {
  let acctId = accountId;
  if (!acctId) {
    const { accountId: currentAccountId } = await authenticateConnection(undefined, context);
    acctId = currentAccountId;
  }

  const sessionsCursor = search(Session, { accountId: acctId, expiry: { $gt: new Date() } });

  const connectionIds: string[] = [];
  for await (const session of sessionsCursor.iterator) {
    connectionIds.push(session.auxId);
  }

  return connectionIds;
};

export default getActiveConnectionIds;
