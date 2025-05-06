import { test } from '@jest/globals';
import { compose } from '../compose.js';
import { hook } from '../hook.js';

test('props stop gap', async () => {
  const func = compose(
    useApiKey('donttell'),
    useLog(),
    useNamedFunc('test'),
    useRoute(),
    async (props) => {
      expect(props.auth.secret).toBe('donttell');
      return 'success';
    }
  );
  expect(await func({})).toBe('success');
});

/**
 * @param {string} secret
 * @returns {(func: (props: import('../types.js').Props<{}, {}, { secret: string }>) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useApiKey = (secret) =>
  hook((func) => async (props) => {
    return await func({
      ...props,
      auth: { secret }
    });
  });

/**
 * @returns {(func: (props: import('../types.js').Props) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useLog = () =>
  hook((func) => async (props) => {
    return await func(props);
  });

/**
 * @param {string} name
 * @returns {(func: (props: import('../types.js').Props) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useNamedFunc = (name) =>
  hook((func) => async (props) => {
    return await func(props);
  });

/**
 * @returns {(func: (props: import('../types.js').Props) => Promise<any>) => (props: import('../types.js').Props) => Promise<any>}
 */
const useRoute = () =>
  hook((func) => async (props) => {
    return await func(props);
  }); 