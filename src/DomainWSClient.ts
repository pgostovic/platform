import { MessageConnection } from '@phnq/message';
import { WebSocketMessageClient } from '@phnq/message/WebSocketMessageClient';

import DomainClient from './DomainClient';
import { DomainServiceApi, ServiceMessage } from './types';

export default class DomainWSClient extends DomainClient {
  protected static create(url: string, DomainClientClass: typeof DomainWSClient): DomainServiceApi {
    const client = new DomainClientClass(url);
    client.initialize();
    return client.getProxy();
  }

  private url: string;

  protected constructor(url: string, domain: string = 'domain') {
    super(domain);
    this.url = url;
  }

  protected async getMessageClient(): Promise<MessageConnection<ServiceMessage>> {
    return WebSocketMessageClient.create<ServiceMessage>(this.url);
  }
}
