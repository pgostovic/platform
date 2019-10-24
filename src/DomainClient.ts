import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { MessageConnection, Value } from '@phnq/message';
import prettyHrtime from 'pretty-hrtime';

import { ApiServiceMessage, DomainServiceApi } from './types';

interface QueuedCall {
  key: string;
  args: Value[];
  resolve: (msg: Value) => void;
  reject: (err: Error) => void;
}

interface NotficationHandlerEntry {
  type: string;
  handler: ({ type, info }: { type: string; info: Value }) => void;
}

export default abstract class DomainClient {
  private domain: string;
  private log: Logger;
  private messageClient?: MessageConnection<ApiServiceMessage>;
  private typesLoaded = false;
  private q: QueuedCall[] = [];
  private proxy: DomainServiceApi;
  private notificationHandlers: NotficationHandlerEntry[] = [];

  protected constructor(domain: string = 'domain') {
    this.domain = domain;
    this.log = createLogger(`client.${domain}`);
    this.proxy = new Proxy(this, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (target: any, key: string): any => {
        return (
          target[key] ||
          (this.typesLoaded
            ? undefined
            : (...args: Value[]): Promise<Value> =>
                new Promise((resolve, reject): void => {
                  this.q.push({ key, args, resolve, reject });
                }))
        );
      },
    });
  }

  public on(type: string, handler: ({ type, info }: { type: string; info: Value }) => void): void {
    this.notificationHandlers.push({ type, handler });
  }

  protected getProxy(): DomainServiceApi {
    return this.proxy;
  }

  protected abstract async getMessageClient(): Promise<MessageConnection<ApiServiceMessage>>;

  protected createRequestMessage(type: string, data: Value, connectionId?: string): ApiServiceMessage {
    return { info: data, type: `${this.domain}.${type}`, connectionId };
  }

  protected async initialize(): Promise<void> {
    const messageClient = await this.getMessageClient();
    messageClient.onConversation((c): void => {
      this.log.groupCollapsed(
        `${(c.request.p as ApiServiceMessage).type} (${prettyHrtime(c.responses.slice(-1)[0].time)})`,
        (l: Logger): void => {
          c.responses.forEach((r): void => {
            l('%s', prettyHrtime(r.time), r.message);
          });
        },
      );
    });

    this.messageClient = messageClient;

    this.messageClient.onReceive(async ({ type, info }) => {
      const localType = (type || '').replace(new RegExp(`^${this.domain}\.`), '');
      this.notificationHandlers.filter(h => h.type === localType).forEach(h => h.handler({ type, info }));
    });

    const defaultTimeout = this.messageClient.responseTimeout;
    // Set the timeout to a low value when getting handlers so it fails quickly.
    this.messageClient.responseTimeout = 1000;

    let result: { handlers: string[] } | undefined = undefined;

    let numTries = 0;
    while (!result) {
      try {
        const { info } = await this.messageClient.requestOne(this.createRequestMessage('handlers', {}));
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

    result.handlers.forEach((handler): void => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: async (data: Value, connectionId?: string): Promise<Value | AsyncIterableIterator<Value>> => {
          const response = await messageClient.request(this.createRequestMessage(handler, data, connectionId));

          if (
            typeof response === 'object' &&
            (response as AsyncIterableIterator<ApiServiceMessage>)[Symbol.asyncIterator]
          ) {
            return (async function*(): AsyncIterableIterator<Value> {
              for await (const resp of response as AsyncIterableIterator<ApiServiceMessage>) {
                yield resp.info;
              }
            })();
          } else {
            return (response as ApiServiceMessage).info;
          }
        },
        writable: true,
      });
    });

    this.typesLoaded = true;

    if (this.q.length > 0) {
      this.log('flushing message queue: ', this.q.map(({ key }: QueuedCall): string => key));
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
