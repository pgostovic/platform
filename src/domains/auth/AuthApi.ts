import { DomainServiceApi } from '../../types';
import { AuthStatus } from './model/account';

export interface AuthApi extends DomainServiceApi {
  authenticate: authenticate;
  createAccount: createAccount;
  createSession: createSession;
  createSessionWithCode: createSessionWithCode;
  destroySession: destroySession;
  setPassword: setPassword;
}

export type authenticate = ({ token }: { token: string }) => Promise<AuthStatus>;

export type createAccount = ({ email }: { email: string }) => Promise<AuthStatus>;

export type createSession = ({ email, password }: { email: string; password: string }) => Promise<{ token: string }>;

export type createSessionWithCode = ({ code }: { code: string }) => Promise<{ token: string }>;

export type destroySession = () => Promise<{ destroyed: boolean }>;

export type setPassword = ({ password }: { password: string }) => Promise<{ passwordSet: boolean }>;
