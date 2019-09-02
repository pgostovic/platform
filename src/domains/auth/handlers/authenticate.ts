import { search } from '@phnq/model';

import { authenticate } from '../AuthApi';
import Session from '../model/Session';

const authenticate: authenticate = async ({ token }, connectionId?: string) => {
  const session = await search(Session, { auxId: connectionId }).first();
  if (session) {
    if (session.token === token && session.expiry.getTime() > Date.now()) {
      return { authenticated: true };
    }
  }
  return { authenticated: false };
};

export default authenticate;
