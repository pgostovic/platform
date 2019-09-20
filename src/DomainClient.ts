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

export default abstract class DomainClient {
  private domain: string;
  private log: Logger;
  private messageClient?: MessageConnection<ApiServiceMessage>;
  private typesLoaded = false;
  private q: QueuedCall[] = [];
  private proxy: DomainServiceApi;

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

  protected getProxy(): DomainServiceApi {
    return this.proxy;
  }

  protected abstract async getMessageClient(): Promise<MessageConnection<ApiServiceMessage>>;

  protected createRequestMessage(type: string, data: Value, connectionId?: string): ApiServiceMessage {
    return { info: data, type: `${this.domain}.${type}`, connectionId };
  }

  protected formatResponse(response: any): any {
    return response;
  }

  protected async initialize(): Promise<void> {
    const messageClient = await this.getMessageClient();
    messageClient.onConversation((c): void => {
      this.log.groupCollapsed(
        `${(c.request.data as ApiServiceMessage).type} (${prettyHrtime(c.responses.slice(-1)[0].time)})`,
        (l: Logger): void => {
          c.responses.forEach((r): void => {
            l('%s', prettyHrtime(r.time), r.message);
          });
        },
      );
    });

    this.messageClient = messageClient;

    const result = this.formatResponse(
      await (this.messageClient.requestOne(this.createRequestMessage('handlers', {})) as any),
    ) as { handlers: string[] };

    const formatResponse = (r: any): any => this.formatResponse(r);

    result.handlers.forEach((handler): void => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: async (
          data: Value,
          connectionId?: string,
        ): Promise<ApiServiceMessage | AsyncIterableIterator<ApiServiceMessage>> => {
          const response = await messageClient.request(this.createRequestMessage(handler, data, connectionId));

          if (typeof response === 'object' && (response as AsyncIterableIterator<Value>)[Symbol.asyncIterator]) {
            return (async function*(): AsyncIterableIterator<ApiServiceMessage> {
              for await (const resp of response as AsyncIterableIterator<ApiServiceMessage>) {
                yield formatResponse(resp) as ApiServiceMessage;
              }
            })();
          } else {
            return formatResponse(response) as ApiServiceMessage;
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
