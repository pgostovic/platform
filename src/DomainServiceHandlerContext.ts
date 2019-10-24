/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection, Value } from '@phnq/message';

import { DomainServiceApi, DomainServiceMessage } from './types';

export default class DomainServiceHandlerContext {
  private domain: string;
  private connectionId: string;
  private apiConnection: MessageConnection<DomainServiceMessage>;

  public constructor(
    domain: string,
    connectionId: string,
    clients: Map<string, DomainServiceApi>,
    apiConnection: MessageConnection<DomainServiceMessage>,
  ) {
    this.domain = domain;
    this.connectionId = connectionId;
    this.apiConnection = apiConnection;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;
      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any) => target[key](params, connectionId),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });
    }
  }

  public getConnectionId(): string {
    return this.connectionId;
  }

  public notify(type: string, info: Value, connectionIds?: string[]): void {
    (connectionIds || [this.connectionId]).forEach(connectionId => {
      const message: DomainServiceMessage = {
        type: `${this.domain}.${type}`,
        info,
        connectionId,
        origin: '',
      };
      this.apiConnection.send(message);
    });
  }
}
