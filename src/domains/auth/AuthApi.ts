import { DomainServiceApi } from '../../types';

export interface AuthApi extends DomainServiceApi {
  authenticate: authenticate;
  createAccount: createAccount;
  createSession: createSession;
  createSessionWithCode: createSessionWithCode;
  destroySession: destroySession;
  setPassword: setPassword;
}

export type authenticate = (params: { token: string }) => Promise<{ authenticated: boolean }>;

export type createAccount = (params: { email: string }) => Promise<{ created: boolean }>;

export type createSession = (params: { email: string; password: string }) => Promise<{ token: string }>;

export type createSessionWithCode = (params: { code: string }) => Promise<{ token: string }>;

export type destroySession = () => Promise<{ destroyed: boolean }>;

export type setPassword = (params: { password: string }) => Promise<{ passwordSet: boolean }>;
