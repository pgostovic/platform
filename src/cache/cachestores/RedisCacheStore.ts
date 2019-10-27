/* eslint-disable @typescript-eslint/no-explicit-any */
import { TedisPool } from 'tedis';

import { CacheStore } from '..';

const CONN_STR_RE = /(([^@]*)@)?([^:]+):(\d+)/;

class RedisCacheStore implements CacheStore {
  private pool: TedisPool;

  public constructor(connStr: string) {
    const [, , password, host, port] = connStr.match(CONN_STR_RE) || [];
    this.pool = new TedisPool({ host, port: parseFloat(port), password });
  }

  public async set(key: string, value: any): Promise<void> {
    const tedis = await this.pool.getTedis();
    try {
      await tedis.set(key, JSON.stringify(value));
    } finally {
      this.pool.putTedis(tedis);
    }
  }
  public async get(key: string): Promise<any> {
    const tedis = await this.pool.getTedis();
    try {
      return JSON.parse((await tedis.get(key)) as string);
    } finally {
      this.pool.putTedis(tedis);
    }
  }
}

export default RedisCacheStore;
