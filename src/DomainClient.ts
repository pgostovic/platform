import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { MessageConnection } from '@phnq/message';
import { Model } from '@phnq/model';
import prettyHrtime from 'pretty-hrtime';

import { DomainServiceApi, NotificationHandler, ServiceMessage } from './types';

MessageConnection.defaultUnmarshalPayload = payload => Model.parse(payload);

interface QueuedCall {
  key: string;
  args: unknown[];
  resolve: (msg: unknown) => void;
  reject: (err: Error) => void;
}

interface NotficationHandlerEntry {
  type: string;
  handler: NotificationHandler<unknown>;
}

export default abstract class DomainClient {
  private domain: string;
  protected log: Logger;
  protected messageClient?: MessageConnection<ServiceMessage>;
  private typesLoaded = false;
  private q: QueuedCall[] = [];
  private proxy: DomainServiceApi;
  private notificationHandlers: NotficationHandlerEntry[] = [];

  protected constructor(domain: string) {
    this.domain = domain;
    this.log = createLogger(`client.${domain}`);
    this.proxy = new Proxy(this, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (target: any, key: string): any => {
        return (
          target[key] ||
          (this.typesLoaded
            ? undefined
            : (...args: unknown[]): Promise<unknown> =>
                new Promise((resolve, reject): void => {
                  this.q.push({ key, args, resolve, reject });
                }))
        );
      },
    });
  }

  public getDomain(): string {
    return this.domain;
  }

  public on(type: string, handler: NotificationHandler<unknown>): void {
    this.notificationHandlers.push({ type, handler });
  }

  public off(type: string, handler?: NotificationHandler<unknown>): void {
    this.notificationHandlers = this.notificationHandlers.filter(
      entry => entry.type !== type || (handler && entry.handler !== handler),
    );
  }

  protected getProxy(): DomainServiceApi {
    return this.proxy;
  }

  protected abstract async createMessageClient(): Promise<MessageConnection<ServiceMessage>>;

  protected createRequestMessage(type: string, data: unknown): ServiceMessage {
    return { info: data, type: `${this.domain}.${type}` };
  }

  protected abstract handleNotification(type: string, info: unknown, handler: NotificationHandler<unknown>): void;

  protected async initialize(): Promise<void> {
    const messageClient = await this.createMessageClient();
    this.messageClient = messageClient;

    messageClient.onConversation = (c): void => {
      this.log.groupCollapsed(
        `${(c.request.p as ServiceMessage).type} (${
          c.responses.length === 0 ? 'one-way' : prettyHrtime(c.responses.slice(-1)[0].time)
        })`,
        (l: Logger): void => {
          c.responses.forEach((r): void => {
            l('%s', prettyHrtime(r.time), r.message);
          });
        },
      );
    };

    messageClient.onReceive = async ({ type, info }) => {
      const broadcastType = process.env.MESSAGE_BROADCAST_TYPE || 'broadcast';
      const m = type.match(new RegExp(`^(${broadcastType}\.)?${this.domain}\.(.+)`));
      if (m) {
        const localType = m[2];
        this.notificationHandlers
          .filter(h => h.type === localType)
          .forEach(h => this.handleNotification(type, info, h.handler));
      }
    };

    const defaultTimeout = messageClient.responseTimeout;
    // Set the timeout to a low value when getting handlers so it fails quickly.
    messageClient.responseTimeout = 1000;

    let result: { handlers: string[] } | undefined = undefined;

    // Send a "handlers" message to get a list of handlers that the service supports
    let numTries = 0;
    while (!result) {
      try {
        const { info } = await messageClient.requestOne(this.createRequestMessage('handlers', {}));
        result = info as { handlers: string[] };
      } catch (err) {
        this.log('Error getting handlers:', err);
        numTries++;
        if (numTries > 5) {
          this.log('Will try again in 10 seconds.');
          await wait(10000);
        } else {
          this.log('Trying again.');
        }
      }
    }

    // Once we have the handlers, set the timeout back to the default.
    this.messageClient.responseTimeout = defaultTimeout;

    // For each handler type, add a method with the same name.
    result.handlers.forEach((handler): void => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: async (data: unknown): Promise<unknown | AsyncIterableIterator<unknown>> => {
          const response = await messageClient.request(this.createRequestMessage(handler, data));

          if (
            typeof response === 'object' &&
            (response as AsyncIterableIterator<ServiceMessage>)[Symbol.asyncIterator]
          ) {
            return (async function*(): AsyncIterableIterator<unknown> {
              for await (const resp of response as AsyncIterableIterator<ServiceMessage>) {
                yield resp.info;
              }
            })();
          } else {
            return (response as ServiceMessage).info;
          }
        },
        writable: true,
      });
    });

    this.typesLoaded = true;

    if (this.q.length > 0) {
      this.log(
        'flushing message queue: ',
        this.q.map(({ key }: QueuedCall): string => key),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxy = this.proxy as any;

    if (proxy) {
      this.q.forEach(
        async ({ key, args, resolve, reject }: QueuedCall): Promise<void> => {
          try {
            resolve(await proxy[key].apply(proxy[key], args));
          } catch (err) {
            reject(err);
          }
        },
      );
    }

    this.q.length = 0;
  }
}

const wait = (millis: number = 0): Promise<void> =>
  new Promise((resolve): void => {
    setTimeout(resolve, millis);
  });
