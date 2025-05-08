import { hook, response as toResponse } from '../core';
import { sort, tryit, unique } from 'radash';
import URL from 'url';

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} TokenUtil
 * @property {() => string} url - The request URL
 * @property {() => string} domain - The request domain
 * @property {() => string} path - The request path
 * @property {() => string} method - The request method
 * @property {(unit: 's' | 'ms') => string} elapsed - The elapsed time in seconds or milliseconds
 * @property {(format: 'iso' | 'timestamp') => string} date - The current date in ISO or timestamp format
 * @property {() => string} status - The response status code
 * @property {() => string} referrer - The request referrer
 * @property {() => string} ip - The request IP address
 * @property {() => string} 'http-version' - The HTTP version
 * @property {() => string} protocol - The request protocol
 * @property {() => string} 'user-agent' - The user agent string
 */

/**
 * @typedef {Object} UseLoggingOptions
 * @property {(message: string) => string} [format] - A function to run on the message to prepare it for being logged
 * @property {{ log: (message: string) => void, error: (message: string) => void }} [logger] - Any object that can do logging
 * @property {(tokens: TokenUtil, props: Props, error: any, response: any) => Record<string, () => string | object>} [tokens] - A function that returns a map of token functions
 */

/**
 * @param {Props} props
 * @param {any} error
 * @param {any} response
 * @returns {TokenUtil}
 */
const Tokens = (props, error, response) => {
  const { request } = props;
  const end = Date.now();
  const milliseconds = end - request.startedAt;
  const seconds = Math.round(milliseconds / 1000);
  return {
    url: () => request.url,
    domain: () => `${URL.parse(request.url).hostname}`,
    path: () => request.path,
    method: () => request.method,
    elapsed: (unit = 'ms') =>
      unit === 'ms' ? `${milliseconds}ms` : `${seconds}s`,
    date: (format = 'timestamp') => {
      const now = new Date();
      if (format === 'iso') return now.toISOString();
      return `${now}`;
    },
    status: () => `${response.status}`,
    referrer: () => `${request.headers.referer || request.headers.referrer}`,
    ip: () => request.ip,
    'http-version': () => request.httpVersion,
    protocol: () => request.protocol,
    'user-agent': () => `${request.headers['user-agent'] ?? ''}`
  };
};

/**
 * @param {string} [template] - The log format template
 * @param {UseLoggingOptions} [options] - The logging options
 * @returns {(func: (props: Props) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useLogging = (template = '[:method] :path at :date(iso) -> :status in :elapsed(ms)', options = {}) =>
  hook(function useLogging(func) {
    return async props => {
      const [error, result] = await tryit(func)(props);
      const response = toResponse(error, result);

      const tokens = {
        ...Tokens(props, error, response),
        ...(options.tokens?.(Tokens(props, error, response), props, error, response) ?? {})
      };

      const format = options.format ?? (message => message);
      const logger = options.logger ?? console;

      const message = Object.entries(tokens).reduce((msg, [key, fn]) => {
        return msg.replace(`:${key}`, fn());
      }, template);

      if (error) {
        logger.error(format(message));
      } else {
        logger.log(format(message));
      }

      return response;
    };
  });
