import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { Value } from '@phnq/message';
import { WebSocketMessageClient } from '@phnq/message/WebSocketMessageClient';
import prettyHrtime from 'pretty-hrtime';

import { ApiServiceMessage, DomainServiceApi } from './types';

const log = createLogger('DomainClient');

interface QueuedCall {
  key: string;
  args: Value[];
  resolve: (msg: Value) => void;
  reject: (err: Error) => void;
}

export default class DomainClient {
  public static create(url: string, DomainClientClass = DomainClient): DomainServiceApi {
    const client = new DomainClientClass(url);
    client.initialize();

    const proxy = new Proxy(client, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (target: any, key: string): any => {
        return (
          target[key] ||
          (client.typesLoaded
            ? undefined
            : (...args: Value[]): Promise<Value> =>
                new Promise((resolve, reject): void => {
                  client.q.push({ key, args, resolve, reject });
                }))
        );
      },
    });

    client.proxy = proxy;

    return proxy;
  }

  private url: string;
  private domain: string;
  private messageClient?: WebSocketMessageClient<ApiServiceMessage>;
  private typesLoaded = false;
  private q: QueuedCall[] = [];
  private proxy?: ProxyConstructor;

  protected constructor(url: string, domain: string = 'domain') {
    this.url = url;
    this.domain = domain;
  }

  protected handle(type: string, data: Value): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> {
    return (this.messageClient as WebSocketMessageClient<ApiServiceMessage>).request({
      info: data,
      type: `${this.domain}.${type}`,
    });
  }

  private async initialize(): Promise<void> {
    const messageClient = await WebSocketMessageClient.create<ApiServiceMessage>(this.url);
    messageClient.onConversation((c): void => {
      log.groupCollapsed(
        `${(c.request.data as ApiServiceMessage).type} (${prettyHrtime(c.responses.slice(-1)[0].time)})`,
        (l: Logger): void => {
          c.responses.forEach((r): void => {
            l('%s', prettyHrtime(r.time), r.message);
          });
        },
      );
    });
    this.messageClient = messageClient;
    const result = (await this.messageClient.requestOne({
      type: `${this.domain}.handlers`,
      info: {},
    })) as { handlers: string[] };

    result.handlers.forEach((handler): void => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: (data: Value): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> =>
          this.handle(handler, data),
        writable: false,
      });
    });

    this.typesLoaded = true;

    if (this.q.length > 0) {
      log('flushing message queue: ', this.q.map(({ key }: QueuedCall): string => key));
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
