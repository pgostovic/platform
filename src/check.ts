import { DomainServiceMessage, UnsignedDomainServiceMessage } from './types';

/**
 * The sig param should be a hash of the message attributes.
 *
 */

export const signedMessage = (message: UnsignedDomainServiceMessage): DomainServiceMessage => {
  return { ...message, sig: 'bubba' };
};

export const verifiedMessage = (message: DomainServiceMessage): DomainServiceMessage => {
  if (message.sig !== 'bubba') {
    throw new Error('Message failed verification');
  }

  return message;
};
