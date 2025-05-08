import { hook, response } from '../core/index.js';
import { tryit } from 'radash';

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} Response
 * @property {any} [error] - The error object if any
 * @property {any} [result] - The result object if any
 */

/**
 * @param {(props: Props, response: Response) => Promise<any>} handler - The error handler function
 * @returns {(func: (props: Props) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useCatch = (handler) =>
  hook(function useCatch(func) {
    return async props => {
      const [error, result] = await tryit(func)(props);
      const res = response(error, result);
      return res.error ? handler(props, res) : res;
    };
  });
