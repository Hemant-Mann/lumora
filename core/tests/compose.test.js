import { describe, expect, test } from '@jest/globals';
import { compose } from '../compose.js';
import { props } from '../props.js';

/**
 * @returns {(func: (props: import('../types.js').Props<{}, {}, {}, import('../types.js').Request, { name: 'next'; startedAt: 100 }>) => Promise<any>) => () => Promise<any>}
 */
const useMockRootHook = () => (func) => {
  const handler = async () => {
    return await func({
      ...props({}),
      framework: {
        name: 'next',
        startedAt: 100
      }
    });
  };
  handler.root = 'next';
  return handler;
};

/**
 * @template TServices
 * @param {TServices} services
 * @returns {(func: (props: import('../types.js').Props<{}, TServices>) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useMockServicesHook = (services) => (func) => {
  const handler = async (props) => {
    return await func({
      ...props,
      services: {
        ...props.services,
        ...services
      }
    });
  };
  handler.services = Object.keys(services);
  return handler;
};

/**
 * @template TArgs
 * @param {TArgs} args
 * @returns {(func: (props: import('../types.js').Props<TArgs>) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useMockArgsHook = (args) => (func) => {
  const handler = async (props) => {
    return await func({
      ...props,
      args: {
        ...props.args,
        ...args
      }
    });
  };
  handler.args = Object.keys(args);
  return handler;
};

/**
 * @template TAuth
 * @param {TAuth} auth
 * @returns {(func: (props: import('../types.js').Props<{}, {}, TAuth>) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useMockAuthHook = (auth) => (func) => {
  const handler = async (props) => {
    return await func({
      ...props,
      auth: {
        ...props.auth,
        ...auth
      }
    });
  };
  handler.auth = Object.keys(auth);
  return handler;
};

describe('compose function types', () => {
  test('it supports 0 hooks', async () => {
    const func = compose(useMockRootHook(), async function theEndpoint(props) {
      expect(props.framework.name).toBe('next');
      return 'success';
    });
    const result = await func();
    expect(func.root).toBe('next');
    expect(result).toBe('success');
  });

  test('it supports 1 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      async (props) => {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('id');
    expect(result).toBe('success');
  });

  test('it supports 2 hooks', async () => {
    const endpoint = async (props) => {
      expect(props.framework.name).toBe('next');
      expect(props.args.id).toBe('first');
      expect(props.auth.token).toBe('secret');
      return 'success';
    };
    endpoint.route = '/api/v1/user';
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      endpoint
    );
    const result = await func();
    expect(func.route).toBe('/api/v1/user');
    expect(func.root).toBe('next');
    expect(func.args).toContain('id');
    expect(result).toBe('success');
  });

  test('it supports 3 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      useMockServicesHook({ db: { users: () => null } }),
      async (props) => {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        expect(props.auth.token).toBe('secret');
        expect(props.services.db.users()).toBeNull();
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('id');
    expect(result).toBe('success');
  });

  test('it supports 4 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      useMockServicesHook({ db: { users: () => null } }),
      useMockArgsHook({ query: 'alto' }),
      async (props) => {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        expect(props.auth.token).toBe('secret');
        expect(props.services.db.users()).toBeNull();
        expect(props.args.query).toBe('alto');
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('query');
    expect(result).toBe('success');
  });

  test('it supports 5 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      useMockServicesHook({ db: { users: () => null } }),
      useMockArgsHook({ query: 'alto' }),
      useMockAuthHook({ secret: 'shh' }),
      async (props) => {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        expect(props.auth.token).toBe('secret');
        expect(props.services.db.users()).toBeNull();
        expect(props.args.query).toBe('alto');
        expect(props.auth.secret).toBe('shh');
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('query');
    expect(func.services).toContain('db');
    expect(result).toBe('success');
  });

  test('it supports 6 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      useMockServicesHook({ db: { users: () => 3 } }),
      useMockArgsHook({ query: 'alto' }),
      useMockAuthHook({ secret: 'shh' }),
      useMockServicesHook({ redis: { users: () => 9 } }),
      async function endpointSixe(props) {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        expect(props.auth.token).toBe('secret');
        expect(props.services.db.users()).toBe(3);
        expect(props.args.query).toBe('alto');
        expect(props.auth.secret).toBe('shh');
        expect(props.services.redis.users()).toBe(9);
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('query');
    expect(result).toBe('success');
  });

  test('it supports 7 hooks', async () => {
    const func = compose(
      useMockRootHook(),
      useMockArgsHook({ id: 'first' }),
      useMockAuthHook({ token: 'secret' }),
      useMockServicesHook({ db: { users: () => 3 } }),
      useMockArgsHook({ query: 'alto' }),
      useMockAuthHook({ secret: 'shh' }),
      useMockServicesHook({ redis: { users: () => 9 } }),
      useMockArgsHook({ name: 'ray' }),
      async (props) => {
        expect(props.framework.name).toBe('next');
        expect(props.args.id).toBe('first');
        expect(props.auth.token).toBe('secret');
        expect(props.services.db.users()).toBe(3);
        expect(props.args.query).toBe('alto');
        expect(props.auth.secret).toBe('shh');
        expect(props.services.redis.users()).toBe(9);
        expect(props.args.name).toBe('ray');
        return 'success';
      }
    );
    const result = await func();
    expect(func.root).toBe('next');
    expect(func.args).toContain('name');
    expect(func.services).toContain('redis');
    expect(func.auth).toContain('secret');
    expect(result).toBe('success');
  });
}); 