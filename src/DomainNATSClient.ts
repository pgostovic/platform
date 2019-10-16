import { Message, MessageConnection, Value } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { connect as connectNATS, NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import DomainClient from './DomainClient';
import { ApiServiceMessage, DomainServiceApi, DomainServiceMessage } from './types';

const ORIGIN = uuid().replace(/[^\w]/g, '');

export default class DomainNATSClient extends DomainClient {
  protected static create(
    natsConfig: NatsConnectionOptions,
    DomainClientClass: typeof DomainNATSClient,
  ): DomainServiceApi {
    const client = new DomainClientClass(natsConfig);
    client.initialize();
    return client.getProxy();
  }

  private natsConfig: NatsConnectionOptions;

  protected constructor(natsConfig: NatsConnectionOptions, domain: string = 'domain') {
    super(domain);
    this.natsConfig = natsConfig;
  }

  protected async getMessageClient(): Promise<MessageConnection<ApiServiceMessage>> {
    const natsClient = await connectNATS(this.natsConfig);
    const natsTransport = await NATSTransport.create(natsClient, {
      subscriptions: [ORIGIN],
      publishSubject: (message: Message<Value>): string => (message.payload as DomainServiceMessage).type as string,
    });
    return new MessageConnection(natsTransport);
  }

  protected createRequestMessage(type: string, data: Value, connectionId?: string): ApiServiceMessage {
    const message = super.createRequestMessage(type, data, connectionId);
    return { ...message, origin: ORIGIN, connectionId };
  }

  protected formatResponse(response: any): any {
    return response.info;
  }
}
