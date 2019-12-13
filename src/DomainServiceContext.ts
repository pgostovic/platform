/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection, Value } from '@phnq/message';
import { ModelId } from '@phnq/model';
import { createNamespace } from 'cls-hooked';

import { AuthApi } from './domains/auth/AuthApi';
import DomainService from './DomainService';
import { JobDescripton } from './jobs-new';
import { DomainServiceApi, DomainServiceMessage } from './types';

const contextNS = createNamespace('DomainServiceContext');

type Identity = { connectionId: string; accountId?: ModelId } | { connectionId?: string; accountId: ModelId };

interface WithAuthApi {
  auth: AuthApi;
}

interface Params {
  service: DomainService;
  clients: Map<string, DomainServiceApi>;
  apiConnection: MessageConnection<DomainServiceMessage>;
  identity: Identity;
}

export default class DomainServiceContext<T = unknown> implements WithAuthApi {
  public static set<T = unknown>({ service, clients, apiConnection, identity }: Params, fn: () => T): T {
    const context = new DomainServiceContext(service, clients, apiConnection, identity);
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
  private readonly identity: Identity;
  // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
  public auth: AuthApi = {} as AuthApi;

  private constructor(
    service: DomainService,
    clients: Map<string, DomainServiceApi>,
    apiConnection: MessageConnection<DomainServiceMessage>,
    identity: Identity,
  ) {
    this.service = service;
    this.apiConnection = apiConnection;
    this.identity = identity;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;

      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any) => target[key](params, this.identity.connectionId),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });
    }
  }

  public asJob(jobDesc: JobDescripton = { runTime: new Date() }): T {
    return new Proxy(
      {},
      {
        get: (_: any, type: string) => (params: Value) => this.service.scheduleJob(jobDesc, type, params),
      },
    );
  }

  public getConnectionId(): string | undefined {
    return this.identity.connectionId;
  }

  public getAccountId(): ModelId | undefined {
    return this.identity.accountId;
  }

  /**
   * Send a push notification. Recipient accounts may be specified, otherwise the current account
   * is the recipient.
   *
   * @param type Notification message type
   * @param info Notification message data
   * @param recipientAccountIds (optional) account ids of the repients
   */
  public async notify(type: string, info: Value, recipientAccountIds?: ModelId[]): Promise<void> {
    const { auth } = (this as unknown) as { auth: AuthApi };

    const accountIds = recipientAccountIds || [undefined];

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
}
