export interface AuthStatus {
  requirePasswordChange: boolean;
}

export interface ServiceMessage {
  type: string;
  info: unknown;
}

export interface DomainServiceMessage extends ServiceMessage {
  origin: string;
  connectionId?: string;
  accountId?: string;
}

export type DomainServiceHandler = (params: unknown) => Promise<unknown> | AsyncIterableIterator<unknown>;

export type NotificationHandler<T> = (params: { type: string; info: T }) => void;

export interface DomainServiceApi {
  handlers(): Promise<{ domain: string; handlers: string[] }>;
  on<T>(type: string, handler: NotificationHandler<T>): void;
  off(type: string, handler?: NotificationHandler<unknown>): void;
}
