import { createLogger } from '@phnq/log';
import { Message, MessageConnection } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import DomainClient from './DomainClient';
import DomainServiceContext from './DomainServiceContext';
import { DomainServiceApi, DomainServiceMessage, ServiceMessage } from './types';

const ORIGIN = uuid().replace(/[^\w]/g, '');

export default class DomainNATSClient extends DomainClient {
  public static create(domain: string, natsConfig: NatsConnectionOptions): DomainServiceApi {
    const client = new DomainNATSClient(domain, natsConfig);
    client.initialize();
    return client.getProxy();
  }

  private natsConfig: NatsConnectionOptions;

  private constructor(domain: string, natsConfig: NatsConnectionOptions) {
    super(domain);
    this.natsConfig = natsConfig;
    this.log = createLogger(`NATSClient.${domain}`);
  }

  protected async createMessageClient(): Promise<MessageConnection<ServiceMessage>> {
    const broadcastType = process.env.MESSAGE_BROADCAST_TYPE || 'broadcast';
    const natsTransport = await NATSTransport.create(this.natsConfig, {
      subscriptions: [ORIGIN, `${broadcastType}.*`],
      publishSubject: (message: Message): string => (message.p as DomainServiceMessage).type as string,
    });
    const signSalt = process.env.MESSAGE_SIGN_SALT;
    if (!signSalt) {
      this.log.warn(`MESSAGE_SIGN_SALT not set for domain client ${this.getDomain()}`);
    }

    return new MessageConnection(natsTransport, { signSalt });
  }

  protected createRequestMessage(type: string, data: unknown): DomainServiceMessage {
    const message = super.createRequestMessage(type, data);
    const context = DomainServiceContext.get();
    const connectionId = context ? context.getConnectionId() : undefined;
    const accountId = context ? context.getAccountId() : undefined;
    return { ...message, origin: ORIGIN, connectionId, accountId };
  }
}
