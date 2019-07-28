import { Anomaly } from '@phnq/message';
import React from 'react';
import ReactDOM from 'react-dom';
import { auth } from './api';
import App from './app';

(async () => {
  console.log('BOTH', await Promise.all([auth.authenticate({ token: 'bubba' }), auth.handlers()]));
  console.log('HANDLERS', await auth.handlers());

  try {
    console.log('AUTH', await auth.authenticate({ token: 'no' }));
  } catch (err) {
    console.log('ERR', err instanceof Anomaly);
  }
})();

ReactDOM.render(<App />, document.getElementById('app'));
