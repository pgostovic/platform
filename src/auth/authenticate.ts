import DomainServiceContext from '../DomainServiceContext';

type Handler = (params: unknown) => unknown;

const authenticate = <T = unknown>(fn: T): T =>
  ((async (params: unknown) => {
    const handler = (fn as unknown) as Handler;
    await DomainServiceContext.get().authenticate();
    return handler(params);
  }) as unknown) as T;

export default authenticate;
