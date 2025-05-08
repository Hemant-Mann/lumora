import { hook, NotAuthenticatedError } from '@tkit/core';
import { isFunction, tryit } from 'radash';

/**
 * @typedef {import('@tkit/core').Props} Props
 */

/**
 * @typedef {Object} ApiKeyAuth
 * @property {string} apiKey
 */

/**
 * @param {string | ((props: Props) => Promise<string>)} keyOrFunc
 * @returns {(func: (props: Props & { auth: ApiKeyAuth }) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useApiKey = (keyOrFunc) =>
  hook(function useApiKey(func) {
    return async (props) => {
      const header = props.request.headers['x-api-key'];
      if (!header) {
        throw new NotAuthenticatedError('This function requires an api key', {
          key: 'lumo.api-key.missing-header'
        });
      }

      // If a `Key ` prefix exists, remove it
      const providedKey = header.replace(/^[Kk]ey\s/, '');
      if (!providedKey) {
        throw new NotAuthenticatedError('Invalid api key', {
          key: 'lumo.api-key.missing-key'
        });
      }

      const [err, key] = await tryit(async () => {
        return isFunction(keyOrFunc) ? await keyOrFunc(props) : keyOrFunc;
      })();

      if (err) {
        throw new NotAuthenticatedError('Server cannot authenticate', {
          key: 'lumo.api-key.key-error'
        });
      }

      if (!key) {
        throw new NotAuthenticatedError('Server cannot authenticate', {
          key: 'lumo.api-key.key-not-found'
        });
      }

      if (providedKey !== key) {
        throw new NotAuthenticatedError('Invalid api key', {
          key: 'lumo.api-key.mismatch'
        });
      }

      return await func({
        ...props,
        auth: {
          ...props.auth,
          apiKey: providedKey
        }
      });
    };
  });
