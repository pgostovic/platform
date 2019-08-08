import path from 'path';
import { DomainService } from '../../DomainService';

export default class AuthService extends DomainService {
  public constructor() {
    super('auth');
    this.addHandlerPath(path.resolve(__dirname, 'handlers'));
  }
}
