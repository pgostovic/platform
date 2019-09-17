import { Data, Value } from '@phnq/message';

export interface AuthStatus extends Data {
  requirePasswordChange: boolean;
}

export interface ApiServiceMessage extends Data {
  type: string;
  info: Value;
}

export interface DomainServiceMessage extends Data {
  type?: string;
  info: Value;
  origin: string;
  connectionId?: string;
}

export type DomainServiceHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  connectionId?: string,
) => Promise<Value> | AsyncIterableIterator<Value>;

export interface DomainServiceApi {
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
