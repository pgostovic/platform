import { Message, MessageConnection } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { connect as connectNATS, NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import { signedMessage } from './check';
import DomainClient from './DomainClient';
import DomainServiceContext from './DomainServiceContext';
import { DomainServiceApi, DomainServiceMessage, ServiceMessage } from './types';

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

  protected async getMessageClient(): Promise<MessageConnection<ServiceMessage>> {
    const natsClient = await connectNATS(this.natsConfig);
    const natsTransport = await NATSTransport.create(natsClient, {
      subscriptions: [ORIGIN],
      publishSubject: (message: Message): string => (message.p as DomainServiceMessage).type as string,
    });
    return new MessageConnection(natsTransport);
  }

  protected createRequestMessage(type: string, data: unknown): DomainServiceMessage {
    const message = super.createRequestMessage(type, data);
    const context = DomainServiceContext.get();
    const connectionId = context ? context.getConnectionId() : undefined;
    const accountId = context ? context.getAccountId() : undefined;
    return signedMessage({ ...message, origin: ORIGIN, connectionId, accountId });
  }
}
