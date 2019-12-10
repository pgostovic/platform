/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection, Value } from '@phnq/message';
import { ModelId } from '@phnq/model';
import { createNamespace } from 'cls-hooked';

import { AuthApi } from './domains/auth/AuthApi';
import { DomainServiceApi, DomainServiceMessage, JobDescripton } from './types';

const contextNS = createNamespace('DomainServiceHandlerContext');

type Identity = { connectionId: string; accountId?: ModelId } | { connectionId?: string; accountId: ModelId };

interface WithAuthApi {
  auth: AuthApi;
}

interface Params {
  domain: string;
  clients: Map<string, DomainServiceApi>;
  apiConnection: MessageConnection<DomainServiceMessage>;
  identity: Identity;
}

export default class DomainServiceHandlerContext implements WithAuthApi {
  public static set<T = unknown>({ domain, clients, apiConnection, identity }: Params, fn: () => T): T {
    const context = new DomainServiceHandlerContext(domain, clients, apiConnection, identity);
    return contextNS.runAndReturn(() => {
      contextNS.set('currentContext', context);
      return fn();
    });
  }

  public static get(): DomainServiceHandlerContext {
    return contextNS.get('currentContext');
  }

  private domain: string;
  private apiConnection: MessageConnection<DomainServiceMessage>;
  private identity: Identity;
  // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
  public auth: AuthApi = {} as AuthApi;

  private constructor(
    domain: string,
    clients: Map<string, DomainServiceApi>,
    apiConnection: MessageConnection<DomainServiceMessage>,
    identity: Identity,
  ) {
    this.domain = domain;
    this.apiConnection = apiConnection;
    this.identity = identity;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;

      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any) => target[key](params, this.identity.connectionId),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });

      const clientJobsProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any, job: JobDescripton = { runTime: new Date() }) =>
          target[key](params, this.identity.connectionId, job),
      });
      Object.defineProperty(this, `${name}Jobs`, { value: clientJobsProxy, writable: true, enumerable: false });
    }
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
            type: `${this.domain}.${type}`,
            info,
            connectionId,
            origin: '',
          }),
        ),
      );
    }
  }
}
