import { Anomaly } from '@phnq/message';
import React from 'react';
import ReactDOM from 'react-dom';
import { auth } from './api';
import App from './app';

// class Anomaly extends Error {
//   public info?: {
//     [key: string]: string | number | boolean;
//   };

//   constructor(
//     message: string,
//     info?: {
//       [key: string]: string | number | boolean;
//     },
//   ) {
//     super(message);
//     this.info = info;
//   }
// }

(async () => {
  try {
    console.log('AUTH', await auth.authenticate({ token: 'no' }));
    // await (async () => {
    //     throw new Anomaly('bubba');
    //   })();
  } catch (err) {
    console.log('ERR YO', err.foo, err.message, err instanceof Anomaly, err);
    const anom = new Anomaly('hello');
    console.log('ERR THE', anom instanceof Anomaly, err instanceof Anomaly);
  }
  // console.log('HANDLERS', await auth.handlers());

  // try {
  //   console.log('BOTH', await Promise.all([auth.authenticate({ token: 'bubba' }), auth.handlers()]));
  //   console.log('AUTH', await auth.authenticate({ token: 'no' }));
  // } catch (err) {
  //   console.log('ERR', err instanceof Anomaly, err);
  // }
})();

ReactDOM.render(<App />, document.getElementById('app'));
