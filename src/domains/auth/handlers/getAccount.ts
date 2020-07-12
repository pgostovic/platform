import { Anomaly } from '@phnq/message';
import { find } from '@phnq/model';

import authenticate from '../../../auth/authenticate';
import DomainServiceContext from '../../../DomainServiceContext';
import { getAccount } from '../AuthApi';
import Account from '../model/Account';

const getAccount: getAccount = async () => {
  const account = await find(Account, DomainServiceContext.get().getAccountId()!);
  if (account) {
    return account;
  }
  throw new Anomaly('Account not found');
};

export default authenticate(getAccount);
