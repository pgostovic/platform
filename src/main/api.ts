import { createLogger } from '@phnq/log';

import ApiService from '../ApiService';

const log = createLogger('main/api');
log('NATS_SERVERS:', process.env.NATS_SERVERS);
log('PORT:', process.env.PORT);

if (!process.env.NATS_SERVERS) {
  throw new Error('Missing config: NATS_SERVERS');
}

if (!process.env.PORT) {
  throw new Error('Missing config: PORT');
}

const config = {
  port: Number(process.env.PORT),
  natsConfig: {
    servers: (process.env.NATS_SERVERS || '').split(','),
  },
};

ApiService.start(config);
