import { createLogger } from '@phnq/log';

import AuthService from '../domains/auth/AuthService';

const log = createLogger('main/auth');
log('NATS_SERVERS:', process.env.NATS_SERVERS);
log('MONGODB_URI:', process.env.MONGODB_URI);
log('REDIS_CONN:', process.env.REDIS_CONN);

if (!process.env.NATS_SERVERS) {
  throw new Error('Missing config: NATS_SERVERS');
}

if (!process.env.MONGODB_URI) {
  throw new Error('Missing config: MONGODB_URI');
}

if (!process.env.REDIS_CONN) {
  throw new Error('Missing config: REDIS_CONN');
}

const config = {
  mongodbUri: process.env.MONGODB_URI,
  redisConn: process.env.REDIS_CONN,
  natsConfig: {
    servers: process.env.NATS_SERVERS.split(','),
  },
};

AuthService.start(config);
