import { DomainServiceApi } from '../../types';

export interface AuthApi extends DomainServiceApi {
  authenticate: authenticate;
  createAccount: createAccount;
  createSession: createSession;
  createSessionWithCode: createSessionWithCode;
  destroySession: destroySession;
  setPassword: setPassword;
}

export type authenticate = ({ token }: { token: string }) => Promise<{ authenticated: boolean }>;

export type createAccount = ({ email }: { email: string }) => Promise<{ created: boolean }>;

export type createSession = ({ email, password }: { email: string; password: string }) => Promise<{ token: string }>;

export type createSessionWithCode = ({ code }: { code: string }) => Promise<{ token: string }>;

export type destroySession = () => Promise<{ destroyed: boolean }>;

export type setPassword = ({ password }: { password: string }) => Promise<{ passwordSet: boolean }>;
