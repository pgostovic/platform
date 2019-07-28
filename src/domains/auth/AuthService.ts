import path from 'path';
import { DomainService } from '../../DomainService';

export default class AuthService extends DomainService {
  constructor() {
    super('auth');
    this.addHandlerPath(path.resolve(__dirname, 'handlers'));
  }
}
