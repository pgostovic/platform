import { createLogger } from '@phnq/log';
import { AnomalyMessage, ErrorMessage, Message, MessageConnection, MessageType, Value } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { promises as fs } from 'fs';
import path from 'path';
import { Client as NATSClient, connect as connectNATS } from 'ts-nats';
import { DomainServiceHandler, DomainServiceMessage } from './types';

const log = createLogger('DomainService');

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

export abstract class DomainService {
  private domain: string;
  private natsClient?: NATSClient;
  private apiConnection?: MessageConnection<DomainServiceMessage>;
  private handlerPaths: string[] = [];
  private handlers = new Map<string, DomainServiceHandler>();

  public constructor(domain: string) {
    this.domain = domain;
  }

  public addHandlerPath(handlerPath: string): void {
    this.handlerPaths.push(handlerPath);
  }

  public async start(): Promise<void> {
    this.natsClient = await connectNATS();

    this.apiConnection = new MessageConnection(
      await NATSTransport.create(this.natsClient, {
        subscriptions: [`${this.domain}.*`],
        publishSubject: mapPublishSubject
      })
    );

    this.apiConnection.onReceive(this.onReceive);

    await this.scanForHandlers();
  }

  public stop(): void {
    if (this.natsClient) {
      this.natsClient.close();
    }
  }

  private async scanForHandlers(): Promise<void> {
    if (this.handlerPaths.length === 0) {
      throw new Error('No handler paths configured.');
    }

    this.handlers.set(
      HANDLERS,
      async (): Promise<Value> => ({ domain: this.domain, handlers: [...this.handlers.keys()] })
    );

    this.handlerPaths.forEach(
      async (handlerPath): Promise<void> => {
        (await fs.readdir(handlerPath))
          .map((name): string => path.basename(name).replace(/\.(d\.ts|js|ts)$/, ''))
          .forEach(
            async (type): Promise<void> => {
              let relHandlerPath = path.relative(__dirname, handlerPath);
              if (relHandlerPath[0] !== '.') {
                relHandlerPath = `./${relHandlerPath}`;
              }
              try {
                const handler = (await import(`${relHandlerPath}/${type}`)).default as DomainServiceHandler;
                this.handlers.set(type, handler);
                log('Registered handler: ', type);
              } catch (err) {
                if (err.code !== 'MODULE_NOT_FOUND') {
                  log('Not a valid handler: ', `${relHandlerPath}/${type}`);
                }
              }
            }
          );
      }
    );
  }

  private onReceive = async ({
    type,
    info,
    connectionId,
    origin
  }: DomainServiceMessage): Promise<DomainServiceMessage | AsyncIterableIterator<DomainServiceMessage>> => {
    const localType = (type || '').replace(new RegExp(`^${this.domain}\.`), '');

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
