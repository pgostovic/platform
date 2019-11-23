import { createLogger } from '@phnq/log';
import { addPersistObserver, setDefaultDataStore } from '@phnq/model';
import AuditLogger from '@phnq/model/AuditLogger';
import { MongoDataStore } from '@phnq/model/datastores/MongoDataStore';
import path from 'path';
import { NatsConnectionOptions } from 'ts-nats';

import { setDefaultCacheStore } from '../../cache';
import RedisCacheStore from '../../cache/cachestores/RedisCacheStore';
import DomainService from '../../DomainService';

const log = createLogger('AuthService');

interface Config {
  natsConfig: NatsConnectionOptions;
  mongodbUri: string;
  redisConn: string;
}

export default class AuthService extends DomainService {
  public static domain = 'auth';

  public static async start(config: Config): Promise<void> {
    const mongoDataStore = new MongoDataStore(config.mongodbUri);

    log('Creating indices...');
    await mongoDataStore.createIndex('Account', { email: 1 }, { unique: true });
    await mongoDataStore.createIndex('Account', { 'authCode.code': 1 }, {});

    await mongoDataStore.createIndex('Session', { token: 1 }, {});
    await mongoDataStore.createIndex('Session', { auxId: 1 }, {});

    setDefaultDataStore(mongoDataStore);

    setDefaultCacheStore(new RedisCacheStore(config.redisConn));

    const auditLogger = new AuditLogger();
    addPersistObserver(auditLogger);

    await new AuthService(config).start();
  }

  private constructor(config: Config) {
    super({
      domain: AuthService.domain,
      handlerPaths: [path.resolve(__dirname, 'handlers')],
      natsConfig: config.natsConfig,
    });
  }
}
