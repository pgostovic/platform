import { createLogger } from '@phnq/log';
import { Logger } from '@phnq/log/logger';
import { MessageConnection, Value } from '@phnq/message';
import prettyHrtime from 'pretty-hrtime';

import { ApiServiceMessage, DomainServiceApi } from './types';

const log = createLogger('DomainClient');

interface QueuedCall {
  key: string;
  args: Value[];
  resolve: (msg: Value) => void;
  reject: (err: Error) => void;
}

export default abstract class DomainClient {
  private domain: string;
  private messageClient?: MessageConnection<ApiServiceMessage>;
  private typesLoaded = false;
  private q: QueuedCall[] = [];
  private proxy: DomainServiceApi;

  protected constructor(domain: string = 'domain') {
    this.domain = domain;
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
    const result = (await this.messageClient.requestOne(this.createRequestMessage('handlers', {}))) as {
      handlers: string[];
    };

    result.handlers.forEach((handler): void => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: (
          data: Value,
          connectionId?: string,
        ): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> =>
          messageClient.request(this.createRequestMessage(handler, data, connectionId)),
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
