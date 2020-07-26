import { createLogger } from '@phnq/log';
import { Message, MessageConnection } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { Model } from '@phnq/model';
import { NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import DomainClient from './DomainClient';
import DomainService from './DomainService';
import DomainServiceContext from './DomainServiceContext';
import { DomainServiceApi, DomainServiceMessage, NotificationHandler, ServiceMessage } from './types';

const ORIGIN = uuid().replace(/[^\w]/g, '');

interface Config {
  nats: NatsConnectionOptions;
  service?: DomainService;
  apiConnection?: MessageConnection<DomainServiceMessage>;
  apiClients?: Map<string, DomainServiceApi>;
}

export default class DomainNATSClient extends DomainClient {
  public static create(domain: string, config: Config): DomainServiceApi {
    const client = new DomainNATSClient(domain, config);
    client.initialize();
    return client.getProxy();
  }

  private config: Config;

  private constructor(domain: string, config: Config) {
    super(domain);
    this.config = config;
    this.log = createLogger(`NATSClient.${domain}`);
  }

  protected async createMessageClient(): Promise<MessageConnection<ServiceMessage>> {
    const broadcastType = process.env.MESSAGE_BROADCAST_TYPE || 'broadcast';
    const natsTransport = await NATSTransport.create(this.config.nats, {
      subscriptions: [ORIGIN, `${broadcastType}.*.*`],
      publishSubject: (message: Message): string => (message.p as DomainServiceMessage).type as string,
    });
    const signSalt = process.env.MESSAGE_SIGN_SALT;
    if (!signSalt) {
      this.log.warn(`MESSAGE_SIGN_SALT not set for domain client ${this.getDomain()}`);
    }

    return new MessageConnection<ServiceMessage>(natsTransport, {
      signSalt,
      unmarshalPayload: p => {
        console.log('----------------- DomainNATSClient UNMARSHAL', p, Model.parse(p));
        return Model.parse(p);
      },
    });
  }

  protected createRequestMessage(type: string, data: unknown): DomainServiceMessage {
    const message = super.createRequestMessage(type, data);
    const context = DomainServiceContext.get();
    const connectionId = context ? context.getConnectionId() : undefined;
    const accountId = context ? context.getAccountId() : undefined;
    return { ...message, origin: ORIGIN, connectionId, accountId };
  }

  protected handleNotification(type: string, info: unknown, handler: NotificationHandler<unknown>): void {
    const { service, apiConnection, apiClients } = this.config;

    if (service && apiConnection && apiClients) {
      DomainServiceContext.set({ service, apiConnection, clients: apiClients }, () => {
        handler({ type, info });
      });
    } else {
      handler({ type, info });
    }
  }
}
