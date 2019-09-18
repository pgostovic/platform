/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import DomainClient from './DomainClient';

export default class DomainServiceHandlerContext {
  private connectionId: string;

  public constructor(connectionId: string, clients: Map<string, DomainClient>) {
    this.connectionId = connectionId;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;
      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (...args: any[]) => target[key](...args, connectionId),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });
    }
  }

  public getConnectionId(): string {
    return this.connectionId;
  }
}
