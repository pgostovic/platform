import { createLogger } from '@phnq/log';
import { ConnectionId, Message, MessageConnection, Value, WebSocketMessageServer } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import http from 'http';
import { Client as NATSClient, connect as connectNATS } from 'ts-nats';
import uuid from 'uuid/v4';
import { ApiServiceMessage, DomainServiceMessage } from './types';

const log = createLogger('ApiService');

const ORIGIN = uuid().replace(/[^\w]/g, '');

export class ApiService {
  private port: number;
  private httpServer: http.Server;
  private natsClient?: NATSClient;
  private messageServer: WebSocketMessageServer<ApiServiceMessage>;
  private servicesConnection?: MessageConnection<DomainServiceMessage>;

  public constructor(port: number) {
    this.port = port;
    this.httpServer = http.createServer();

    this.messageServer = new WebSocketMessageServer<ApiServiceMessage>({
      httpServer: this.httpServer,
      onReceive: this.onReceiveClientMessage
    });
  }

  public async start(): Promise<void> {
    log('Starting server...');
    await new Promise((resolve): void => {
      this.httpServer.listen({ port: this.port }, resolve);
    });
    log('Server listening on port %d', this.port);

    log('Connecting to NATS...');
    this.natsClient = await connectNATS();
    log('Connected to NATS.');

    const natsTransport = await NATSTransport.create(this.natsClient, {
      subscriptions: [ORIGIN],
      publishSubject: (message: Message<Value>): string => (message.data as DomainServiceMessage).type as string
    });

    this.servicesConnection = new MessageConnection(natsTransport);
  }

  public async stop(): Promise<void> {
    log('Stopping server...');
    if (this.natsClient) {
      this.natsClient.close();
    }

    await this.messageServer.close();

    if (this.httpServer.listening) {
      await new Promise((resolve, reject): void => {
        try {
          this.httpServer.close((): void => {
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });
    }
    log('Stopped.');
  }

  private onReceiveClientMessage = async (
    connectionId: ConnectionId,
    { type, info }: ApiServiceMessage
  ): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> => {
    const servicesConnection = this.servicesConnection as MessageConnection<DomainServiceMessage>;
    const serviceRequest: DomainServiceMessage = { type, info, origin: ORIGIN, connectionId };
    const serviceResponse = await servicesConnection.request(serviceRequest);

    if (
      typeof serviceResponse === 'object' &&
      (serviceResponse as AsyncIterableIterator<Value>)[Symbol.asyncIterator]
    ) {
      return (async function*(): AsyncIterableIterator<ApiServiceMessage> {
        for await (const resp of serviceResponse as AsyncIterableIterator<DomainServiceMessage>) {
          yield (resp as DomainServiceMessage).info as ApiServiceMessage;
        }
      })();
    } else {
      return (serviceResponse as DomainServiceMessage).info as ApiServiceMessage;
    }
  };
}
