import { IDomainServiceApi } from '../../types';

export interface IAuthApi extends IDomainServiceApi {
  authenticate: authenticate;
}

export type authenticate = (params: { token: string }) => Promise<{ authenticated: boolean }>;
