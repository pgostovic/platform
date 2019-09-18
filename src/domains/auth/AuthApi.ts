import { ModelId } from '@phnq/model';

import DomainServiceHandlerContext from '../../DomainServiceHandlerContext';
import { AuthStatus, DomainServiceApi } from '../../types';
import Account from './model/account';

export interface AuthApi extends DomainServiceApi {
  authenticate: authenticate;
  authenticateConnection: authenticateConnection;
  createAccount: createAccount;
  getAccount: getAccount;
  createSession: createSession;
  createSessionWithCode: createSessionWithCode;
  destroySession: destroySession;
  setPassword: setPassword;
  resetPassword: resetPassword;
}

export type authenticate = ({ token }: { token: string }) => Promise<AuthStatus>;

export type authenticateConnection = (
  _?: undefined,
  context?: DomainServiceHandlerContext,
) => Promise<{ valid: boolean; accountId: ModelId }>;

export type createAccount = ({ email }: { email: string }) => Promise<AuthStatus>;

export type getAccount = () => Promise<Account>;

export type createSession = ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => Promise<{ token: string; authStatus: AuthStatus }>;

export type createSessionWithCode = ({ code }: { code: string }) => Promise<{ token: string; authStatus: AuthStatus }>;

export type destroySession = () => Promise<{ destroyed: boolean }>;

export type setPassword = ({ password }: { password: string }) => Promise<AuthStatus>;

export type resetPassword = ({ email }: { email: string }) => Promise<{ requested: boolean }>;
