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

/**
 * When a message comes from the APIService (i.e. via a user's websocket) it has a connectionId.
 * When a user authenticates via a token, that connectionId is stored on the user's session record
 * as auxId. A user is authenticated if a session record exists for the supplied token and the
 * session is not expired. TODO: Update the session's token occasionally? Maybe when a new connectionId
 * is used, create a new token and send it back to the client...
 *
 * A DomainServiceMessage message is essentially considered anonymous until it has an authChain. A
 * message may have a connectionId or an authChain or both. The connectionId can be used to create
 * the authChain by
 *
 *
 *
 * [
 *  accountId,
 *  Hash(accountId + timestamp),
 *  Hash(hash1 + accountId + timestamp),
 *  Hash(hash2 + hash1 + accountId + timestamp),
 *  Hash(hash3 + hash2 + hash1 + accountId + timestamp),
 * ]
 *
 * timestamp - most recent nearest 10 seconds +/- 10 sec.
 * Hash - some hash function with salt
 */

export type DomainServiceHandler = (params: unknown) => Promise<unknown> | AsyncIterableIterator<unknown>;

export interface DomainServiceApi {
  handlers(): Promise<{ domain: string; handlers: string[] }>;
}
