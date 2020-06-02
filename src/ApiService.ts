import { createLogger } from '@phnq/log';
import { Message, MessageConnection } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { ConnectionId, WebSocketMessageServer } from '@phnq/message/WebSocketMessageServer';
import http from 'http';
import { NatsConnectionOptions } from 'ts-nats';
import uuid from 'uuid/v4';

import { DomainServiceMessage, ServiceMessage } from './types';

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
  private natsTransport?: NATSTransport;
  private messageServer: WebSocketMessageServer<ServiceMessage>;
  private servicesConnection?: MessageConnection<DomainServiceMessage>;

  private constructor(config: Config) {
    this.config = config;
    this.httpServer = http.createServer();

    this.messageServer = new WebSocketMessageServer<ServiceMessage>({
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
    this.natsTransport = await NATSTransport.create(natsConfig, {
      subscriptions: [ORIGIN, 'notification'],
      publishSubject: (message: Message): string => (message.p as DomainServiceMessage).type as string,
    });
    log('Connected to NATS.');

    const signSalt = process.env.MESSAGE_SIGN_SALT;
    if (!signSalt) {
      log.warn('MESSAGE_SIGN_SALT not set');
    }

    this.servicesConnection = new MessageConnection(this.natsTransport, { signSalt });
    this.servicesConnection.onReceive(message => this.onReceiveDomainMessage(message));
  }

  public async stop(): Promise<void> {
    log('Stopping server...');
    if (this.natsTransport) {
      this.natsTransport.close();
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

  private async onReceiveDomainMessage({
    type,
    info,
    connectionId,
  }: DomainServiceMessage): Promise<DomainServiceMessage> {
    if (!connectionId) {
      throw new Error('No connectionId.');
    }
    const conn = this.messageServer.getConnection(connectionId);
    if (conn) {
      conn.send({ type, info });
    }
    return { type: 'notification-sent', info: {}, origin: ORIGIN, connectionId: '' };
  }

  private onConnect = async (connectionId: ConnectionId, req: http.IncomingMessage): Promise<void> => {
    const acceptLangHeader = req.headers['accept-language'];
    const conn = this.messageServer.getConnection(connectionId);
    if (conn && acceptLangHeader) {
      conn.setData(
        'langs',
        acceptLangHeader.split(',').map(lang => lang.split(';')[0]),
      );
    }

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
    { type, info }: ServiceMessage,
  ): Promise<ServiceMessage | AsyncIterableIterator<ServiceMessage>> => {
    const conn = this.messageServer.getConnection(connectionId);
    const langs = conn ? conn.getData<string[]>('langs') : [];

    const servicesConnection = this.servicesConnection as MessageConnection<DomainServiceMessage>;
    const serviceRequest: DomainServiceMessage = { type, info, origin: ORIGIN, connectionId, langs };
    const serviceResponse = await servicesConnection.request(serviceRequest);

    if (
      typeof serviceResponse === 'object' &&
      (serviceResponse as AsyncIterableIterator<ServiceMessage>)[Symbol.asyncIterator]
    ) {
      return (async function*(): AsyncIterableIterator<ServiceMessage> {
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
