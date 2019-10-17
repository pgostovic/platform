/* eslint-disable @typescript-eslint/no-explicit-any */
import { DomainServiceApi } from './types';

export default class DomainServiceHandlerContext {
  private connectionId: string;

  public constructor(connectionId: string, clients: Map<string, DomainServiceApi>) {
    this.connectionId = connectionId;

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
}