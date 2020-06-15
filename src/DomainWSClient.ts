import { MessageConnection } from '@phnq/message';
import { WebSocketMessageClient } from '@phnq/message/WebSocketMessageClient';

import DomainClient from './DomainClient';
import { DomainServiceApi, ServiceMessage } from './types';

export default class DomainWSClient extends DomainClient {
  public static create(domain: string, url: string): DomainServiceApi {
    const client = new DomainWSClient(domain, url);
    client.initialize();
    return client.getProxy();
  }

  private url: string;

  private constructor(domain: string, url: string) {
    super(domain);
    this.url = url;
  }

  protected async createMessageClient(): Promise<MessageConnection<ServiceMessage>> {
    return WebSocketMessageClient.create<ServiceMessage>(this.url);
  }
}
