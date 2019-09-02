import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { AnomalyMessage, ErrorMessage, Message, MessageConnection, MessageType, Value } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { promises as fs } from 'fs';
import path from 'path';
import { Client as NATSClient, connect as connectNATS, NatsConnectionOptions } from 'ts-nats';

import { DomainServiceHandler, DomainServiceMessage } from './types';

const HANDLERS = 'handlers';

const mapPublishSubject = (message: Message<Value>): string => {
  switch (message.type) {
    case MessageType.Response:
    case MessageType.Multi:
      return (message.data as DomainServiceMessage).origin;

    case MessageType.Anomaly:
      return ((message as AnomalyMessage).data.requestData as DomainServiceMessage).origin;

    case MessageType.Error:
      return ((message as ErrorMessage).data.requestData as DomainServiceMessage).origin;
  }
  throw new Error('Unable to derive publish subject');
};

interface Config {
  domain: string;
  natsConfig: NatsConnectionOptions;
  handlerPaths: string[];
}

export default abstract class DomainService {
  private config: Config;
  private log: Logger;
  private natsClient?: NATSClient;
  private apiConnection?: MessageConnection<DomainServiceMessage>;
  private handlers = new Map<string, DomainServiceHandler>();

  protected constructor(config: Config) {
    this.config = config;
    this.log = createLogger(config.domain);
  }

  public async start(): Promise<void> {
    const { domain, natsConfig } = this.config;
    this.log('Starting...');

    this.log('Connecting to NATS...');
    this.natsClient = await connectNATS(natsConfig);
    this.log('Connected to NATS.');

    this.apiConnection = new MessageConnection(
      await NATSTransport.create(this.natsClient, {
        subscriptions: [`${domain}.*`],
        publishSubject: mapPublishSubject,
      }),
    );

    this.apiConnection.onReceive(this.onReceive);

    await this.scanForHandlers();
  }

  public stop(): void {
    this.log('Stopping...');
    if (this.natsClient) {
      this.natsClient.close();
    }
  }

  private async scanForHandlers(): Promise<void> {
    const { handlerPaths, domain } = this.config;

    if (handlerPaths.length === 0) {
      throw new Error('No handler paths configured.');
    }

    this.log('handler paths: %O', handlerPaths);

    this.handlers.set(HANDLERS, async (): Promise<Value> => ({ domain: domain, handlers: [...this.handlers.keys()] }));

    handlerPaths.forEach(
      async (handlerPath): Promise<void> => {
        new Set(
          (await fs.readdir(handlerPath)).map((name): string => path.basename(name).replace(/\.(d\.ts|js|ts)$/, '')),
        ).forEach(
          async (type): Promise<void> => {
            let relHandlerPath = path.relative(__dirname, handlerPath);
            if (relHandlerPath[0] !== '.') {
              relHandlerPath = `./${relHandlerPath}`;
            }
            try {
              const handler = (await import(`${relHandlerPath}/${type}`)).default as DomainServiceHandler;
              this.handlers.set(type, handler);
              this.log('Registered handler: %s', type);
            } catch (err) {
              if (err.code !== 'MODULE_NOT_FOUND') {
                this.log.warn('Not a valid handler: %s', `${relHandlerPath}/${type}`);
              }
            }
          },
        );
      },
    );
  }

  private onReceive = async ({
    type,
    info,
    connectionId,
    origin,
  }: DomainServiceMessage): Promise<DomainServiceMessage | AsyncIterableIterator<DomainServiceMessage>> => {
    const localType = (type || '').replace(new RegExp(`^${this.config.domain}\.`), '');

    const handler = this.handlers.get(localType);
    if (!handler) {
      throw new Error(`handler type not supported: ${localType}`);
    }

    const resp = await handler(info, connectionId);

    if (typeof resp === 'object' && (resp as AsyncIterableIterator<DomainServiceMessage>)[Symbol.asyncIterator]) {
      return (async function*(): AsyncIterableIterator<DomainServiceMessage> {
        for await (const r of resp as AsyncIterableIterator<DomainServiceMessage>) {
          yield { info: r as Value, origin };
        }
      })();
    } else {
      return { info: resp as Value, origin };
    }
  };
}
