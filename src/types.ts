import { IValue } from '@phnq/message';

export interface IApiServiceRequest {
  type: string;
  info: IValue;
}

export interface IDomainServiceRequest {
  type: string;
  info: IValue;
  origin: string;
}

export interface IDomainServiceResponse {
  info: IValue;
  origin: string;
}

export type DomainServiceHandler = (params: any) => Promise<IValue> | AsyncIterableIterator<IValue>;

export interface IDomainServiceApi {
  [key: string]: DomainServiceHandler;
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
