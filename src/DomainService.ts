import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { AnomalyMessage, ErrorMessage, Message, MessageConnection, MessageType } from '@phnq/message';
import { NATSTransport } from '@phnq/message/transports/NATSTransport';
import { ModelId } from '@phnq/model';
import { DataStore } from '@phnq/model/Datastore';
import { promises as fs } from 'fs';
import path from 'path';
import { NatsConnectionOptions } from 'ts-nats';

import authenticate from './auth/authenticate';
import DomainNATSClient from './DomainNATSClient';
import DomainServiceContext from './DomainServiceContext';
import Jobs, { JOB_KEY, JobDescripton } from './jobs';
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
  private natsTransport?: NATSTransport;
  private apiConnection?: MessageConnection<DomainServiceMessage>;
  private handlers = new Map<string, DomainServiceHandler>();
  private apiClients = new Map<string, DomainServiceApi>();
  private datastore?: DataStore;
  private jobs: Jobs;

  protected constructor(config: Config, datastore?: DataStore) {
    this.config = config;
    this.datastore = datastore;
    this.log = createLogger(config.domain);

    // AuthService comes for free
    if (config.domain !== 'auth') {
      this.addApiClient('auth');
    }

    this.jobs = new Jobs(this);
  }

  public getDataStore(): DataStore | undefined {
    return this.datastore;
  }

  public getDomain(): string {
    return this.config.domain;
  }

  public async start(): Promise<void> {
    const { domain, natsConfig } = this.config;
    this.log('Starting...');

    this.log('Connecting to NATS...');
    const signSalt = process.env.MESSAGE_SIGN_SALT;
    if (!signSalt) {
      this.log.warn(`MESSAGE_SIGN_SALT not set for domain service ${this.getDomain()}`);
    }

    this.natsTransport = await NATSTransport.create(natsConfig, {
      subscriptions: [`${domain}.*`],
      publishSubject: mapPublishSubject,
    });
    this.log('Connected to NATS.');

    this.apiConnection = new MessageConnection(this.natsTransport, { signSalt });

    this.apiConnection.onReceive = message => this.onReceive(message);

    await this.scanForHandlers();

    if (this.datastore) {
      await this.jobs.start();
    } else {
      this.log('Starting without Jobs support: no datastore configured');
    }
  }

  public stop(): void {
    this.log('Stopping...');
    if (this.natsTransport) {
      this.natsTransport.close();
    }
  }

  public getHandlerTypes(): string[] {
    return [...this.handlers.keys()];
  }

  public async scheduleJob(jobDesc: JobDescripton, type: string, info: unknown): Promise<void> {
    await this.jobs.schedule(
      jobDesc,
      `${this.getDomain()}.${type}`,
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
        jobKey: JOB_KEY,
      },
      async () => {
        const context = DomainServiceContext.get();
        const resp = await authenticate(handler)(info);

        if (typeof resp === 'object' && (resp as AsyncIterableIterator<DomainServiceMessage>)[Symbol.asyncIterator]) {
          for await (const r of resp as AsyncIterableIterator<DomainServiceMessage>) {
            await context.notify(`jobResult.${localType}`, r, [accountId]);
          }
        } else if (resp) {
          await context.notify(`jobResult.${localType}`, resp, [accountId]);
        }
      },
    );
  }

  protected addApiClient(name: string): void {
    this.apiClients.set(name, DomainNATSClient.create(name, this.config.natsConfig));
  }

  protected getApiClients(): Map<string, DomainServiceApi> {
    return this.apiClients;
  }

  private toLocalType(messageType: string): string {
    return (messageType || '').replace(new RegExp(`^${this.getDomain()}\.`), '');
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
        let relHandlerPath = path.relative(__dirname, handlerPath);
        if (relHandlerPath[0] !== '.') {
          relHandlerPath = `./${relHandlerPath}`;
        }

        const handlerNames = new Set(
          (await fs.readdir(handlerPath))
            .filter(name => !name.match(/^\S+\.d\.ts$/))
            .filter(name => name.match(/^\S+\.[jt]s$/))
            .map(name => path.basename(name, '.js'))
            .map(name => path.basename(name, '.ts')),
        );

        handlerNames.forEach(async handlerName => {
          try {
            const handler = (await import(`${relHandlerPath}/${handlerName}`)).default as DomainServiceHandler;
            this.handlers.set(handlerName, handler);
            this.log('Registered handler: %s', handlerName);
          } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
              this.log.warn('Not a valid handler: %s', `${relHandlerPath}/${handlerName}`);
            } else {
              this.log.warn('Not a valid handler: %s', `${relHandlerPath}/${handlerName}`, err);
            }
          }
        });
      },
    );
  }

  /**
   * Override this to set up per-handler actions.
   */
  protected handlerWillBeInvoked(): Promise<void> {
    return Promise.resolve();
  }

  private onReceive = async ({
    type,
    info,
    connectionId,
    accountId,
    origin,
    langs,
  }: DomainServiceMessage): Promise<DomainServiceMessage | AsyncIterableIterator<DomainServiceMessage>> =>
    DomainServiceContext.set(
      {
        service: this,
        clients: this.apiClients,
        apiConnection: this.apiConnection!,
        connectionId,
        accountId,
        langs,
      },
      async () => {
        const localType = this.toLocalType(type);

        const handler = this.handlers.get(localType);
        if (!handler) {
          throw new Error(`handler type not supported: ${localType}`);
        }

        await this.handlerWillBeInvoked();

        const resp = await handler(info);

        if (typeof resp === 'object' && (resp as AsyncIterableIterator<DomainServiceMessage>)[Symbol.asyncIterator]) {
          return (async function*(): AsyncIterableIterator<DomainServiceMessage> {
            for await (const r of resp as AsyncIterableIterator<DomainServiceMessage>) {
              yield { type: 'response', info: r, origin, connectionId, accountId };
            }
          })();
        } else {
          return { type: 'response', info: resp, origin, connectionId, accountId };
        }
      },
    );
}
