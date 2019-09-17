import { Anomaly } from '@phnq/message';
import { find } from '@phnq/model';

import { getAccount } from '../AuthApi';
import Account from '../model/account';
import authenticateConnection from './authenticateConnection';

const getAccount: getAccount = async ({ accountId }, connectionId?: string) => {
  await authenticateConnection({ connectionId: connectionId || '' });

  const account = await find(Account, accountId);
  if (account) {
    return account;
  }
  throw new Anomaly('Account not found');
};

export default getAccount;
