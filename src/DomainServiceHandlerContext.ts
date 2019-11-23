/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageConnection, Value } from '@phnq/message';
import { ModelId, search } from '@phnq/model';

import { AuthApi } from './domains/auth/AuthApi';
import Session from './domains/auth/model/Session';
import { DomainServiceApi, DomainServiceMessage } from './types';

export default class DomainServiceHandlerContext {
  private domain: string;
  private connectionId: string;
  private apiConnection: MessageConnection<DomainServiceMessage>;

  public constructor(
    domain: string,
    connectionId: string,
    clients: Map<string, DomainServiceApi>,
    apiConnection: MessageConnection<DomainServiceMessage>,
  ) {
    this.domain = domain;
    this.connectionId = connectionId;
    this.apiConnection = apiConnection;

    for (const name of clients.keys()) {
      const client = clients.get(name)!;
      const clientProxy = new Proxy(client, {
        get: (target: any, key: any) => (params: any) => target[key](params, connectionId),
      });
      Object.defineProperty(this, name, { value: clientProxy, writable: true, enumerable: false });
    }
  }

  public getConnectionId(): string {
    return this.connectionId;
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

    let accountIds = recipientAccountIds;
    if (!accountIds) {
      const session = await search(Session, { auxId: this.connectionId }).first();
      if (!session) {
        throw new Error(`Could not find session by auxId: ${this.connectionId}`);
      }
      accountIds = [session.accountId];
    }

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
