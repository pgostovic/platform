import { NatsConnectionOptions } from 'ts-nats';

import DomainNATSClient from '../../DomainNATSClient';
import { AuthApi } from './AuthApi';

export default class AuthNATSClient extends DomainNATSClient {
  public static create(natsConfig: NatsConnectionOptions): AuthApi {
    return DomainNATSClient.create(natsConfig, AuthNATSClient) as AuthApi;
  }

  protected constructor(natsConfig: NatsConnectionOptions) {
    super(natsConfig, 'auth');
  }
}
