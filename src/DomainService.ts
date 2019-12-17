import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { AnomalyMessage, ErrorMessage, Message, MessageConnection, MessageType } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { ModelId } from '@phnq/model';
import { promises as fs } from 'fs';
import path from 'path';
import { Client as NATSClient, connect as connectNATS, NatsConnectionOptions } from 'ts-nats';

import { signedMessage, verifiedMessage } from './check';
import { AuthApi } from './domains/auth/AuthApi';
import AuthNATSClient from './domains/auth/AuthNATSClient';
import DomainServiceContext from './DomainServiceContext';
import Jobs, { JobDescripton } from './jobs';
import { DomainServiceApi, DomainServiceHandler, DomainServiceMessage } from './types';

const HANDLERS = 'handlers';

const mapPublishSubject = (message: Message): string => {
  switch (message.t) {
    case MessageType.Send:
      return 'notification';

    case MessageType.Response:
    case MessageType.Multi:
      return (message.p as DomainServiceMessage).origin;

    case MessageType.Anomaly:
      return ((message as AnomalyMessage).p.requestPayload as DomainServiceMessage).origin;

    case MessageType.Error:
      return ((message as ErrorMessage).p.requestPayload as DomainServiceMessage).origin;
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
  private authClient: AuthApi;
  private apiClients = new Map<string, DomainServiceApi>();
  private jobs = new Jobs(this);

  protected constructor(config: Config) {
    this.config = config;
    this.log = createLogger(config.domain);
    this.authClient = AuthNATSClient.create(config.natsConfig);

    // AuthService comes for free
    if (config.domain !== 'auth') {
      this.addApiClient('auth', this.authClient);
    }
  }

  public getDomain(): string {
    return this.config.domain;
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

    this.apiConnection.onReceive(message => this.onReceive(verifiedMessage(message)));

    await this.scanForHandlers();

    await this.jobs.start();
  }

  public stop(): void {
    this.log('Stopping...');
    if (this.natsClient) {
      this.natsClient.close();
    }
  }

  public getHandlerTypes(): string[] {
    return [...this.handlers.keys()];
  }

  public async scheduleJob(jobDesc: JobDescripton, type: string, info: unknown): Promise<void> {
    await this.jobs.schedule(
      jobDesc,
      `${this.config.domain}.${type}`,
      info,
      await DomainServiceContext.get().auth.getAccount(),
    );
  }

  public async executeJob(type: string, info: unknown, accountId: ModelId): Promise<void> {
    const localType = this.toLocalType(type);
    const handler = this.handlers.get(localType);
    if (!handler) {
      throw new Error(`handler type not supported: ${localType}`);
    }

    DomainServiceContext.set(
      {
        service: this,
        clients: this.apiClients,
        apiConnection: this.apiConnection!,
        accountId,
      },
      async () => {
        const context = DomainServiceContext.get();
        const resp = await handler(info);

        if (typeof resp === 'object' && (resp as AsyncIterableIterator<DomainServiceMessage>)[Symbol.asyncIterator]) {
          for await (const r of resp as AsyncIterableIterator<DomainServiceMessage>) {
            await context.notify(`jobResult.${type}`, r, [accountId]);
          }
        } else {
          await context.notify(`jobResult.${type}`, resp, [accountId]);
        }
      },
    );

    // this.authClient.getActiveConnectionIds({ accountId });

    // Conundrum: do I try to return a response if the connectionId is still active? Or is it better
    // to just establish that jobs return nothing?
    // Some options:
    // 1. If the connectionId is active, then return the handler response to the connection as normal
    //      - problem with this is the requestId that connects responses to requests is not available at this level of abstraction
    //      - it's also a bit haphazard -- would only apply in short term jobs
    // 2. Ignore the handler response, or log a warning if one is returned
    //      - The handler could use context.notify() if needed
    //      - not bad
    // 3. Make the response meaningful -- job handler repsonse goes to all active connections for the account
    //      - It would basically do as above in #2, but instead of explicitly having to call context.notify(),
    //        the response would just be automaically sent to all active connections with some reasonable
    //        type -- maybe something like jobResponse:${domain}.${type}
  }

  protected addApiClient(name: string, client: DomainServiceApi): void {
    this.apiClients.set(name, client);
  }

  protected getApiClients(): Map<string, DomainServiceApi> {
    return this.apiClients;
  }

  private toLocalType(messageType: string): string {
    return (messageType || '').replace(new RegExp(`^${this.config.domain}\.`), '');
  }

  private async scanForHandlers(): Promise<void> {
    const { handlerPaths, domain } = this.config;

    if (handlerPaths.length === 0) {
      throw new Error('No handler paths configured.');
    }

    this.log('handler paths: %O', handlerPaths);

    this.handlers.set(
      HANDLERS,
      async (): Promise<unknown> => ({ domain: domain, handlers: [...this.handlers.keys()] }),
    );

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
    accountId,
    origin,
  }: DomainServiceMessage): Promise<DomainServiceMessage | AsyncIterableIterator<DomainServiceMessage>> => {
    if (!connectionId && !accountId) {
      throw new Error('One of connectionId or accountId must be present');
    }

    return DomainServiceContext.set(
      {
        service: this,
        clients: this.apiClients,
        apiConnection: this.apiConnection!,
        connectionId,
        accountId,
      },
      async () => {
        const localType = this.toLocalType(type);

        const handler = this.handlers.get(localType);
        if (!handler) {
          throw new Error(`handler type not supported: ${localType}`);
        }

        const resp = await handler(info);

        if (typeof resp === 'object' && (resp as AsyncIterableIterator<DomainServiceMessage>)[Symbol.asyncIterator]) {
          return (async function*(): AsyncIterableIterator<DomainServiceMessage> {
            for await (const r of resp as AsyncIterableIterator<DomainServiceMessage>) {
              yield signedMessage({ type: 'response', info: r, origin, connectionId });
            }
          })();
        } else {
          return signedMessage({ type: 'response', info: resp, origin, connectionId });
        }
      },
    );
  };
}
