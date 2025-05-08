import { hook, response } from '../core/index.js';
import { shake, tryit, unique } from 'radash';

export const DEFAULT_METHODS = [
  'GET',
  'OPTIONS',
  'PATCH',
  'DELETE',
  'POST',
  'PUT'
];

export const DEFAULT_HEADERS = [
  'X-CSRF-Token',
  'X-Requested-With',
  'Authorization',
  'Accept',
  'Accept-Version',
  'Content-Length',
  'Content-MD5',
  'Content-Type',
  'Date',
  'X-Api-Version'
];

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} UseCorsConfig
 * @property {'*' | string[]} [headers] - List of headers the browser should allow in a request made to access the resource you're securing.
 * @property {'*' | string[]} [origins] - List of origins the browser should allow to make a request to access the resource you're securing.
 * @property {'*' | string[]} [methods] - List of HTTP methods the browser should allow to make a request to the resource you're securing.
 * @property {boolean} [strict] - If true your provided options will be used exclusively. If false (default) your provided options will be appended to the default list of values.
 * @property {boolean} [credentials] - If true, the Access-Control-Allow-Credentials will be set to true. Defaults to false.
 */

/**
 * @param {UseCorsConfig} config
 * @returns {string}
 */
const origins = (config) => {
  if (!config.origins) return '*';
  if (config.origins === '*') return '*';
  return config.origins.join(', ');
};

/**
 * @param {UseCorsConfig} config
 * @returns {string}
 */
const headers = (config) => {
  if (!config.headers) return DEFAULT_HEADERS.join(', ');
  if (config.headers === '*') return '*';
  return config.strict === true
    ? config.headers.join(', ')
    : unique([...DEFAULT_HEADERS, ...config.headers]).join(', ');
};

/**
 * @param {UseCorsConfig} config
 * @returns {string}
 */
const methods = (config) => {
  if (!config.methods) return DEFAULT_METHODS.join(', ');
  if (config.methods === '*') return '*';
  return config.strict === true
    ? config.methods.join(', ')
    : unique([...DEFAULT_METHODS, ...config.methods]).join(', ');
};

/**
 * @param {UseCorsConfig} config
 * @returns {string|undefined}
 */
const credentials = (config) => {
  if (!config.credentials) return undefined;
  return 'true';
};

/**
 * @param {UseCorsConfig} [config]
 * @returns {(func: (props: Props) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useCors = (config = {}) =>
  hook(function useCors(func) {
    return async props => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': origins(config),
        'Access-Control-Allow-Methods': methods(config),
        'Access-Control-Allow-Headers': headers(config)
      };

      if (config.credentials) {
        corsHeaders['Access-Control-Allow-Credentials'] = credentials(config);
      }

      if (props.request.method === 'OPTIONS') {
        return response(null, null, 204, corsHeaders);
      }

      const [error, result] = await tryit(func)(props);
      return response(error, result, undefined, corsHeaders);
    };
  });
