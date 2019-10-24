import { search } from '@phnq/model';

import DomainServiceHandlerContext from '../../../DomainServiceHandlerContext';
import { notifyCurrentAccountSessions } from '../AuthApi';
import Session from '../model/Session';

const notifyCurrentAccountSessions: notifyCurrentAccountSessions = async (
  { type, info },
  context?: DomainServiceHandlerContext,
) => {
  const currentSession = await search(Session, { auxId: context!.getConnectionId() }).first();
  if (currentSession) {
    for await (const session of search(Session, { accountId: currentSession.accountId }).iterator) {
      const auxId = session.auxId;
      // TODO: this will send as the auth domain -- need to be able to override this
      context!.notify(type, info, auxId);
    }
  }
};

export default notifyCurrentAccountSessions;
