import DomainClient from '../../DomainClient';
import { IAuthApi } from './AuthApi';

export default class AuthClient extends DomainClient {
  public static create(url: string): IAuthApi {
    return DomainClient.create(url, AuthClient);
  }

  protected constructor(url: string) {
    super(url, 'auth');
  }

  protected async handle(type: string, data: any) {
    try {
      return await super.handle(type, data);
    } catch (err) {
      console.log('THERE WAS AN ERR', err);
      throw err;
    }
  }
}

// try {
// return await messageClient.request({ type: `${this.domain}.${handler}`, info: data });
// return resp;
// } catch (err) {
//   if (err instanceof Anomaly && err.data.code === AnomalyCode.NoSession) {
//     // if there's no session then try to authenticate, then retry the same message again
//     if ((await (apiProxy as IApi).authenticate({ token: retrieveClientToken() })).authenticated) {
//       return await messageClient.send(handler, data);
//     } else {
//       throw new Anomaly('Unauthorized', { code: AnomalyCode.Unauthorized });
//     }
//   } else {
//     throw err;
//   }
// }
// },
