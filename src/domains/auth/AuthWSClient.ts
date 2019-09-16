import DomainWSClient from '../../DomainWSClient';
import { AuthApi } from './AuthApi';

export default class AuthWSClient extends DomainWSClient {
  public static create(url: string): AuthApi {
    return DomainWSClient.create(url, AuthWSClient) as AuthApi;
  }

  protected constructor(url: string) {
    super(url, 'auth');
  }
}
