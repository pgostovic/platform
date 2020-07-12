import { createLogger } from '@phnq/log';
import { datastore } from '@phnq/model';
import { MongoDataStore } from '@phnq/model/datastores/MongoDataStore';
import path from 'path';

import { setDefaultCacheStore } from '../../cache';
import RedisCacheStore from '../../cache/cachestores/RedisCacheStore';
import DomainService from '../../DomainService';
import { mongodbUri, natsConfig, redisConn } from './config';
import Account from './model/Account';
import Session from './model/Session';

const log = createLogger('AuthService');

export default class AuthService extends DomainService {
  public static domain = 'auth';
  public static datastore = new MongoDataStore(mongodbUri);

  public static async start(): Promise<void> {
    log('Creating indices...');
    await this.datastore.createIndex('Account', { email: 1 }, { unique: true });
    await this.datastore.createIndex('Account', { 'authCode.code': 1 }, {});

    await this.datastore.createIndex('Session', { token: 1 }, {});
    await this.datastore.createIndex('Session', { auxId: 1 }, {});

    datastore(this.datastore)(Account);
    datastore(this.datastore)(Session);

    setDefaultCacheStore(new RedisCacheStore(redisConn));

    await new AuthService().start();
  }

  private constructor() {
    super(
      {
        domain: AuthService.domain,
        handlerPaths: [path.resolve(__dirname, 'handlers')],
        natsConfig,
      },
      AuthService.datastore,
    );
  }
}
