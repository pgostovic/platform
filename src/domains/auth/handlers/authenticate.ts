import { Anomaly } from '@phnq/message';
import { authenticate } from '../AuthApi';

const authenticate: authenticate = async params => {
  console.log('AUTH TOKEN', params.token);
  if (params.token === 'no') {
    throw new Anomaly('No way Jose!');
  }

  return { authenticated: false };
};

export default authenticate;
