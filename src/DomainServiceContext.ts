/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection } from '@phnq/message';
import { ModelId } from '@phnq/model';
import { createNamespace } from 'cls-hooked';

import { AuthApi } from './domains/auth/AuthApi';
import authenticateConnection from './domains/auth/handlers/authenticateConnection';
import DomainService from './DomainService';
import { JOB_KEY, JobDescripton } from './jobs';
import { DomainServiceApi, DomainServiceMessage } from './types';

const contextNS = createNamespace('DomainServiceContext');

interface WithAuthApi {
  auth: AuthApi;
}

interface Params {
  service: DomainService;
  clients: Map<string, DomainServiceApi>;
  apiConnection: MessageConnection<DomainServiceMessage>;
  connectionId?: string;
  accountId?: ModelId;
  langs?: string[];
  jobKey?: string;
}

export default class DomainServiceContext<T = unknown> implements WithAuthApi {
  public static set<T = unknown>(
    { service, clients, apiConnection, connectionId, accountId, langs, jobKey }: Params,
    fn: () => T,
  ): T {
    const context = new DomainServiceContext(service, clients, apiConnection, connectionId, accountId, langs, jobKey);
    return contextNS.runAndReturn(() => {
      contextNS.set('currentContext', context);
      return fn();
    });
  }

  public static bridge<T = unknown>(context: DomainServiceContext, fn: () => T): T {
    return contextNS.runAndReturn(() => {
      contextNS.set('currentContext', context);
      return fn();
    });
  }

  public static get<T, C = {}>(): DomainServiceContext<T> & C {
    return contextNS.get('currentContext');
  }

  private readonly service: DomainService;
  private readonly apiConnection: MessageConnection<DomainServiceMessage>;
  private connectionId?: string;
  private accountId?: ModelId;
  private langs?: string[];
  private jobKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
  public auth: AuthApi = {} as AuthApi;

  private constructor(
    service: DomainService,
    clients: Map<string, DomainServiceApi>,
    apiConnection: MessageConnection<DomainServiceMessage>,
    connectionId?: string,
    accountId?: ModelId,
    langs?: string[],
    jobKey?: string,
  ) {
    this.service = service;
    this.apiConnection = apiConnection;
    this.connectionId = connectionId;
    this.accountId = accountId;
    this.langs = langs;
    this.jobKey = jobKey;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;

      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any) => target[key](params),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });
    }
  }

  public asJob(jobDesc: JobDescripton = { runTime: new Date() }): T {
    return new Proxy(
      {},
      {
        get: (_: any, type: string) => (params: unknown) => this.service.scheduleJob(jobDesc, type, params),
      },
    );
  }

  public getConnectionId(): string | undefined {
    return this.connectionId;
  }

  public getAccountId(): ModelId | undefined {
    return this.accountId;
  }

  public getLangs(): string[] | undefined {
    return this.langs;
  }

  /**
   * Determine the account for the current context. An error is thrown if the account
   * cannot be determined.
   */
  public async authenticate(): Promise<void> {
    if (this.jobKey && (this.jobKey !== JOB_KEY || !this.accountId)) {
      throw new Error('Not authenticated');
    } else if (this.service.getDomain() === 'auth') {
      this.accountId = this.accountId || (await authenticateConnection()).accountId;
    } else {
      this.accountId = this.accountId || (await this.auth.authenticateConnection()).accountId;
    }
  }

  /**
   * Send a push notification. Recipient accounts may be specified, otherwise the current account
   * is the recipient.
   *
   * @param type Notification message type
   * @param info Notification message data
   * @param recipientAccountIds (optional) account ids of the repients
   */
  public async notify(type: string, info: unknown, recipientAccountIds?: ModelId[]): Promise<void> {
    const { auth } = (this as unknown) as { auth: AuthApi };

    const accountIds = recipientAccountIds || [this.accountId];

    for await (const accountId of accountIds) {
      const connectionIds = await auth.getActiveConnectionIds({ accountId });

      await Promise.all(
        connectionIds.map(connectionId =>
          this.apiConnection.send({
            type: `${this.service.getDomain()}.${type}`,
            info,
            connectionId,
            origin: '',
          }),
        ),
      );
    }
  }

  public async broadcast(type: string, info: unknown): Promise<void> {
    const broadcastType = process.env.MESSAGE_BROADCAST_TYPE || 'broadcast';

    return this.apiConnection.send({
      type: `${broadcastType}.${this.service.getDomain()}.${type}`,
      info,
      origin: '',
    });
  }
}
