import { createLogger } from '@phnq/log';
import { ConnectionId, Message, MessageConnection, Value, WebSocketMessageServer } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import http from 'http';
import { Client as NATSClient, connect as connectNATS, NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import { ApiServiceMessage, DomainServiceMessage } from './types';

const authTokenCookie = process.env.AUTH_TOKEN_COOKIE;

const log = createLogger('ApiService');

const ORIGIN = uuid().replace(/[^\w]/g, '');

interface Config {
  port: number;
  natsConfig: NatsConnectionOptions;
}

export default class ApiService {
  public static start(config: Config): void {
    new ApiService(config).start();
  }

  private config: Config;
  private httpServer: http.Server;
  private natsClient?: NATSClient;
  private messageServer: WebSocketMessageServer<ApiServiceMessage>;
  private servicesConnection?: MessageConnection<DomainServiceMessage>;

  private constructor(config: Config) {
    this.config = config;
    this.httpServer = http.createServer();

    this.messageServer = new WebSocketMessageServer<ApiServiceMessage>({
      httpServer: this.httpServer,
      onReceive: this.onReceiveClientMessage,
      onConnect: this.onConnect,
    });
  }

  public async start(): Promise<void> {
    const { port, natsConfig } = this.config;

    log('Starting server...');
    await new Promise((resolve): void => {
      this.httpServer.listen({ port: port }, resolve);
    });
    log('Server listening on port %d', port);

    log('Connecting to NATS...');
    this.natsClient = await connectNATS(natsConfig);
    log('Connected to NATS.');

    const natsTransport = await NATSTransport.create(this.natsClient, {
      subscriptions: [ORIGIN],
      publishSubject: (message: Message<Value>): string => (message.payload as DomainServiceMessage).type as string,
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

  private onConnect = async (connectionId: ConnectionId, req: http.IncomingMessage): Promise<void> => {
    if (authTokenCookie) {
      const cookie = getParsedCookie(req.headers.cookie || '');
      const token = cookie[authTokenCookie];
      if (token) {
        try {
          await this.onReceiveClientMessage(connectionId, {
            type: 'auth.authenticate',
            info: { token },
          });
        } catch (err) {
          log.warn('Failed authentication on connect with token: %s', token);
        }
      }
    }
  };

  private onReceiveClientMessage = async (
    connectionId: ConnectionId,
    { type, info }: ApiServiceMessage,
  ): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> => {
    const servicesConnection = this.servicesConnection as MessageConnection<DomainServiceMessage>;
    const serviceRequest: DomainServiceMessage = { type, info, origin: ORIGIN, connectionId };
    const serviceResponse = await servicesConnection.request(serviceRequest);

    if (
      typeof serviceResponse === 'object' &&
      (serviceResponse as AsyncIterableIterator<Value>)[Symbol.asyncIterator]
    ) {
      return (async function*(): AsyncIterableIterator<ApiServiceMessage> {
        for await (const { type, info } of serviceResponse as AsyncIterableIterator<DomainServiceMessage>) {
          yield { type, info };
        }
      })();
    } else {
      const { type, info } = serviceResponse as DomainServiceMessage;
      return { type, info };
    }
  };
}

const getParsedCookie = (cookie: string): { [key: string]: string } =>
  cookie
    .split(/\s*;\s*/)
    .map(c => c.split('='))
    .reduce((o, t) => ({ ...o, [t[0]]: decodeURIComponent(t[1]) }), {});
