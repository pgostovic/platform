import DomainServiceContext from '../DomainServiceContext';

type Handler = (params: unknown) => unknown;

const authenticate = <T = unknown>(fn: T): T =>
  ((async (params: unknown) => {
    const handler = (fn as unknown) as Handler;
    const context = DomainServiceContext.get();
    await context.auth.authenticateConnection();
    return handler(params);
  }) as unknown) as T;

export default authenticate;
