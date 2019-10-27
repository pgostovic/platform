/* eslint-disable @typescript-eslint/no-explicit-any */
import MemoryCacheStore from './cachestores/MemoryCacheStore';

export interface CacheStore {
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any | undefined>;
}

let defaultCacheStore: CacheStore = new MemoryCacheStore();

export const setDefaultCacheStore = (cacheStore: CacheStore): void => {
  defaultCacheStore = cacheStore;
};

export class CacheEntry<T> {
  private key: string;
  private initialValue: T;
  private explicitCacheStore: CacheStore | undefined;

  public constructor(key: string, initialValue: T, cacheStore?: CacheStore) {
    this.key = key;
    this.initialValue = initialValue;
    this.explicitCacheStore = cacheStore;
  }

  public async get(): Promise<T> {
    return (await this.cacheStore.get(this.key)) || this.initialValue;
  }

  public async set(value: T): Promise<void> {
    await this.cacheStore.set(this.key, value);
  }

  private get cacheStore(): CacheStore {
    return this.explicitCacheStore || defaultCacheStore;
  }
}
