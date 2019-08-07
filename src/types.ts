import { Data, Value } from '@phnq/message';

export interface IApiServiceMessage extends Data {
  type: string;
  info: Value;
}

export interface IDomainServiceMessage extends Data {
  type?: string;
  info: Value;
  origin: string;
  connectionId?: string;
}

export type DomainServiceHandler = (
  params: any,
  connectionId?: string,
) => Promise<Value> | AsyncIterableIterator<Value>;

export interface IDomainServiceApi {
  [key: string]: DomainServiceHandler;
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
