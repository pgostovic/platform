import { createLogger } from '@phnq/log';
import { AnomalyMessage, ErrorMessage, Message, MessageConnection, MessageType, Value } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { promises as fs } from 'fs';
import path from 'path';
import { Client as NATSClient, connect as connectNATS } from 'ts-nats';
import { DomainServiceHandler, IDomainServiceRequest, IDomainServiceResponse } from './types';

const log = createLogger('DomainService');

const HANDLERS = 'handlers';

export abstract class DomainService {
  private domain: string;
  private natsClient?: NATSClient;
  private apiConnection?: MessageConnection;
  private handlerPaths: string[] = [];
  private handlers = new Map<string, DomainServiceHandler>();

  constructor(domain: string) {
    this.domain = domain;
  }

  public addHandlerPath(handlerPath: string) {
    this.handlerPaths.push(handlerPath);
  }

  public async start() {
    this.natsClient = await connectNATS();

    this.apiConnection = new MessageConnection(
      await NATSTransport.create(this.natsClient, {
        subscriptions: [`${this.domain}.*`],
        publishSubject: mapPublishSubject,
      }),
    );

    this.apiConnection.onReceive(this.onReceive);

    await this.scanForHandlers();
  }

  public async stop() {
    if (this.natsClient) {
      this.natsClient.close();
    }
  }

  private async scanForHandlers() {
    if (this.handlerPaths.length === 0) {
      throw new Error('No handler paths configured.');
    }

    this.handlers.set(HANDLERS, async () => ({ domain: this.domain, handlers: [...this.handlers.keys()] }));

    this.handlerPaths.forEach(async handlerPath => {
      (await fs.readdir(handlerPath))
        .map(name => path.basename(name).replace(/\.(d\.ts|js|ts)$/, ''))
        .forEach(async type => {
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
        });
    });
  }

  private onReceive = async (message: Value): Promise<Value | AsyncIterableIterator<Value>> => {
    const req = message as IDomainServiceRequest;
    const localType = req.type.replace(new RegExp(`^${this.domain}\.`), '');

    const handler = this.handlers.get(localType);
    if (!handler) {
      throw new Error(`handler type not supported: ${localType}`);
    }

    const resp = await handler(req.info, req.connectionId);

    if (typeof resp === 'object' && (resp as AsyncIterableIterator<Value>)[Symbol.asyncIterator]) {
      return (async function*() {
        for await (const r of resp as AsyncIterableIterator<Value>) {
          yield { info: r as Value, origin: req.origin };
        }
      })();
    } else {
      return { info: resp as Value, origin: req.origin };
    }
  };
}

const mapPublishSubject = (message: Message) => {
  switch (message.type) {
    case MessageType.Response:
    case MessageType.Multi:
      return (message.data as IDomainServiceResponse).origin;

    case MessageType.Anomaly:
      return ((message as AnomalyMessage).data.requestData as IDomainServiceRequest).origin;

    case MessageType.Error:
      return ((message as ErrorMessage).data.requestData as IDomainServiceRequest).origin;
  }
  throw new Error('Unable to derive publish subject');
};
