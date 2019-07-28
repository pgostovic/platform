import AuthClient from '../../../src/domains/auth/AuthClient';

export const auth = AuthClient.create('ws://localhost:55556');
