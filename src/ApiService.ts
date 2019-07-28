import { createLogger } from '@phnq/log';
import { ConnectionId, IMessage, MessageConnection, WebSocketMessageServer } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import http from 'http';
import { Client as NATSClient, connect as connectNATS } from 'ts-nats';
import uuid from 'uuid/v4';
import { IApiServiceRequest, IDomainServiceRequest, IDomainServiceResponse } from './types';

const log = createLogger('server');

const ORIGIN = uuid().replace(/[^\w]/g, '');

export class ApiService {
  private port: number;
  private httpServer: http.Server;
  private natsClient?: NATSClient;
  private messageServer: WebSocketMessageServer<IApiServiceRequest>;
  private servicesConnection?: MessageConnection;

  constructor(port: number) {
    this.port = port;
    this.httpServer = http.createServer();

    this.messageServer = new WebSocketMessageServer<IApiServiceRequest>({
      httpServer: this.httpServer,
      onReceive: this.onReceiveClientMessage,
    });

    this.messageServer.addResponseMapper((_, res: IDomainServiceResponse) => res.info);
  }

  public async start() {
    log('Starting server...');
    await new Promise(resolve => {
      this.httpServer.listen({ port: this.port }, resolve);
    });
    log('Server listening on port %d', this.port);

    log('Connecting to NATS...');
    this.natsClient = await connectNATS();
    log('Connected to NATS.');

    const natsTransport = await NATSTransport.create(this.natsClient, {
      subscriptions: [ORIGIN],
      publishSubject: (message: IMessage) => (message.data as IDomainServiceRequest).type,
    });

    this.servicesConnection = new MessageConnection(natsTransport);
  }

  public async stop() {
    log('Stopping server...');
    if (this.natsClient) {
      this.natsClient.close();
    }

    await this.messageServer.close();

    if (this.httpServer.listening) {
      await new Promise((resolve, reject) => {
        try {
          this.httpServer.close(() => {
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });
    }
    log('Stopped.');
  }

  private onReceiveClientMessage = (_: ConnectionId, { type, info }: IApiServiceRequest) => {
    const servicesConnection = this.servicesConnection as MessageConnection;
    const serviceRequest = { type, info, origin: ORIGIN };
    return servicesConnection.request(serviceRequest);
  };
}
