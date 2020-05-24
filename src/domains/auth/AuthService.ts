import { createLogger } from '@phnq/log';
import { addPersistObserver } from '@phnq/model';
import AuditLogger from '@phnq/model/AuditLogger';
import { MongoDataStore } from '@phnq/model/datastores/MongoDataStore';
import path from 'path';

import { setDefaultCacheStore } from '../../cache';
import RedisCacheStore from '../../cache/cachestores/RedisCacheStore';
import DomainService from '../../DomainService';
import { mongodbUri, natsConfig, redisConn } from './config';

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

    setDefaultCacheStore(new RedisCacheStore(redisConn));

    const auditLogger = new AuditLogger();
    addPersistObserver(auditLogger);

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
