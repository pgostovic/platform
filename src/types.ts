import { Data, Value } from '@phnq/message';

export interface IApiServiceRequest extends Data {
  type: string;
  info: Value;
}

export interface IApiServiceResponse extends Data {
  type: string;
  info: Value;
}

export interface IDomainServiceRequest extends Data {
  type: string;
  info: Value;
  origin: string;
  connectionId: string;
}

export interface IDomainServiceResponse extends Data {
  info: Value;
  origin: string;
}

export type DomainServiceHandler = (
  params: any,
  connectionId?: string,
) => Promise<Value> | AsyncIterableIterator<Value>;

export interface IDomainServiceApi {
  [key: string]: DomainServiceHandler;
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
