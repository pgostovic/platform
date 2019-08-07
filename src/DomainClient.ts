import { createLogger } from '@phnq/log';
import { WebSocketMessageClient } from '@phnq/message/WebSocketMessageClient';
import prettyHrtime from 'pretty-hrtime';
import { IApiServiceRequest } from './types';

const log = createLogger('DomainClient');

export default class DomainClient {
  public static create(url: string, DomainClientClass = DomainClient) {
    const client = new DomainClientClass(url);
    client.initialize();

    const proxy = new Proxy(client, {
      get: (target: any, key: string) => {
        return (
          target[key] ||
          (client.typesLoaded
            ? undefined
            : (...args: any[]) =>
                new Promise((resolve, reject) => {
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
  private messageClient?: WebSocketMessageClient;
  private typesLoaded = false;
  private q: Array<{ key: string; args: any[]; resolve: (msg: any) => void; reject: (err: Error) => void }> = [];
  private proxy?: ProxyConstructor;

  protected constructor(url: string, domain: string = 'domain') {
    this.url = url;
    this.domain = domain;
  }

  protected handle(type: string, data: any) {
    return (this.messageClient as WebSocketMessageClient).request({
      info: data,
      type: `${this.domain}.${type}`,
    });
  }

  private async initialize() {
    const messageClient = await WebSocketMessageClient.create(this.url);
    messageClient.onConversation(c => {
      log.groupCollapsed(
        `${(c.request.data! as IApiServiceRequest).type} (${prettyHrtime(c.responses.slice(-1)[0].time)})`,
        l => {
          c.responses.forEach(r => {
            l('%s', prettyHrtime(r.time), r.message);
          });
        },
      );
    });
    this.messageClient = messageClient;
    const result = (await this.messageClient.requestOne({
      info: {},
      type: `${this.domain}.handlers`,
    })) as { handlers: string[] };

    result.handlers.forEach(handler => {
      Object.defineProperty(this, handler, {
        enumerable: true,
        value: (data: any) => this.handle(handler, data),
        writable: false,
      });
    });

    this.typesLoaded = true;

    if (this.q.length > 0) {
      log('flushing message queue: ', this.q.map(({ key }) => key));
    }

    const proxy = this.proxy as any;

    this.q.forEach(async ({ key, args, resolve, reject }) => {
      try {
        resolve(await proxy[key].apply(proxy[key], args));
      } catch (err) {
        reject(err);
      }
    });

    this.q.length = 0;
  }
}
