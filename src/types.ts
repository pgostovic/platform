import { Data, Value } from '@phnq/message';

export interface AuthStatus extends Data {
  requirePasswordChange: boolean;
}

export interface ApiServiceMessage extends Data {
  type: string;
  info: Value;
}

export interface JobDescripton extends Data {
  runTime: Date;
}

export interface DomainServiceMessage extends Data {
  type: string;
  info: Value;
  origin: string;
  connectionId: string;
  job?: JobDescripton;
}

export type DomainServiceHandler = (params: unknown) => Promise<Value> | AsyncIterableIterator<Value>;

export interface DomainServiceApi {
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
