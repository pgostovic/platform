/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection, Value } from '@phnq/message';
import { ModelId } from '@phnq/model';

import { AuthApi } from './domains/auth/AuthApi';
import { DomainServiceApi, DomainServiceMessage } from './types';

type Identity = { connectionId: string; accountId?: ModelId } | { connectionId?: string; accountId: ModelId };

export default class DomainServiceHandlerContext {
  private domain: string;
  private apiConnection: MessageConnection<DomainServiceMessage>;
  private identity: Identity;

  public constructor(
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
