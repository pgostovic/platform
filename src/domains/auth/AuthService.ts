import { addPersistObserver, setDefaultDataStore } from '@phnq/model';
import AuditLogger from '@phnq/model/AuditLogger';
import { MongoDataStore } from '@phnq/model/datastores/MongoDataStore';
import path from 'path';
import { NatsConnectionOptions } from 'ts-nats';

import DomainService from '../../DomainService';

interface Config {
  natsConfig: NatsConnectionOptions;
  mongodbUri: string;
}

export default class AuthService extends DomainService {
  public static start(config: Config): void {
    const mongoDataStore = new MongoDataStore(config.mongodbUri);

    mongoDataStore.createIndex('Account', { email: 1 }, { unique: true });
    mongoDataStore.createIndex('Account', { 'authCode.code': 1 }, {});

    mongoDataStore.createIndex('Session', { token: 1 }, {});
    mongoDataStore.createIndex('Session', { auxId: 1 }, {});

    setDefaultDataStore(mongoDataStore);

    const auditLogger = new AuditLogger();
    addPersistObserver(auditLogger);

    new AuthService(config).start();
  }

  private constructor(config: Config) {
    super({ domain: 'auth', handlerPaths: [path.resolve(__dirname, 'handlers')], natsConfig: config.natsConfig });
  }
}
