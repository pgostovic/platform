import { createLogger } from '@phnq/log';
import { NatsConnectionOptions } from 'ts-nats';

const NATS_SERVERS = process.env.NATS_SERVERS;
const MONGODB_URI = process.env.MONGODB_URI || process.env.AUTH_MONGODB_URI;
const REDIS_CONN = process.env.REDIS_CONN;

const log = createLogger('main/engine');
log('NATS_SERVERS:', NATS_SERVERS);
log('MONGODB_URI:', MONGODB_URI);
log('REDIS_CONN:', REDIS_CONN);

if (!NATS_SERVERS) {
  throw new Error('Missing config: NATS_SERVERS');
}

if (!MONGODB_URI) {
  throw new Error('Missing config: MONGODB_URI');
}

if (!REDIS_CONN) {
  throw new Error('Missing config: REDIS_CONN');
}

export const mongodbUri = MONGODB_URI;

export const redisConn = REDIS_CONN;

export const natsConfig: NatsConnectionOptions = {
  servers: NATS_SERVERS.split(','),
};
