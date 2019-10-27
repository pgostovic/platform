/* eslint-disable @typescript-eslint/no-explicit-any */
import { CacheStore } from '..';

class MemoryCacheStore implements CacheStore {
  private data = new Map<string, any>();

  public async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
  public async get(key: string): Promise<any | undefined> {
    return this.data.get(key);
  }
}

export default MemoryCacheStore;
