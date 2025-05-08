import { hook, NotAuthenticatedError } from '../core';

/**
 * @typedef {import('../core').Props} Props
 */
/**
 * @typedef {Object} BasicAuth
 * @property {string} clientId
 * @property {string} clientSecret
 */

/**
 * @returns {(func: (props: Props & { auth: BasicAuth }) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useBasicAuth = () =>
  hook(function useBasicAuth(func) {
    return async props => {
      const header = props.request.headers['authorization'];
      if (!header) {
        throw new NotAuthenticatedError(
          'This function requires authentication via a token',
          {
            key: 'lumo.err.basic.noheader'
          }
        );
      }

      const basicToken =
        header.startsWith('Basic ') && header.replace('Basic ', '');
      if (!basicToken) {
        throw new NotAuthenticatedError(
          'This function requires authentication via a token',
          {
            key: 'lumo.err.basic.nobasic'
          }
        );
      }

      const [clientId, clientSecret] = Buffer.from(basicToken, 'base64')
        .toString()
        .split(':');

      if (!clientId || !clientSecret) {
        throw new NotAuthenticatedError(
          'Cannot call this function without a valid authentication token',
          {
            key: 'lumo.err.basic.misformat'
          }
        );
      }

      return await func({
        ...props,
        auth: {
          ...props.auth,
          clientId,
          clientSecret
        }
      });
    };
  });
