import { InternalServerError, NextFunc, RateLimitError, Response, response } from '../core';
import dur from 'durhuman';
import { isFunction, tryit } from 'radash';

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} IRateLimitStore
 * @property {function(string): Promise<{count: number, timestamp: number}>} inc - A function that should incrament the currently stored number of requests in the current window and return both the total number of requests made in the current window and the beginning timestamp of the window
 * @property {function(string): Promise<void>} reset - Reset the counter for a key
 */

/**
 * @typedef {Object} IRateLimitLogger
 * @property {function(...any): void} log - Log information
 * @property {function(...any): void} warn - Log warnings
 * @property {function(...any): void} error - Log errors
 */

/**
 * @typedef {Object} UseRateLimitLimit
 * @property {string} window - Time to live. The amount of time before we should consider an item in the cache to be fresh. The hook will ignore an item in the cache if the TTL has passed
 * @property {number} max - The maximum number of requests allowed for a single identity during the window
 */

/**
 * @typedef {Object} UseRateLimitOption
 * @property {string} key - A string unique to the items you are using this hook to cache. You'll likely want to use a unique key in every endpoint
 * @property {UseRateLimitLimit|((props: Props) => UseRateLimitLimit|Promise<UseRateLimitLimit>)} limit - The rate limit configuration
 * @property {(props: Props) => string} toIdentity - A mapping function to convert the args into an object that should be used to generate the cache key
 * @property {IRateLimitLogger} [logger] - If passed, the hook will log information about the caching using this object. If nothing is passed the hook will be silent
 * @property {IRateLimitStore|((props: Props) => IRateLimitStore|Promise<IRateLimitStore>)} [store] - An optional function telling the rate limit hook where to get the store object
 * @property {boolean} [strict=true] - Strict tells the rate limit hook if it should return an error to the user when an error is thrown while interacting with the store. If strict is false, errors will be ignored and the will be called
 */

/**
 * Executes a function with rate limiting
 * @param {NextFunc} func - The function to execute
 * @param {UseRateLimitOption} options - The rate limit options
 * @param {Props} props - The request props
 * @returns {Promise<Response>}
 */
export async function withRateLimiting(func, options, props) {
  const { key: prefix, limit: limitFn, toIdentity, logger, strict = true, store: storeFn } = options;
  const key = `${prefix}.${toIdentity(props)}`;
  const services = props.services || {};
  
  if (!storeFn && !services.store) {
    logger?.error(
      '[useRateLimit] Misconfigured, a store must be passed either in the services or options',
      {
        options: { store: storeFn },
        services: { store: services.store }
      }
    );
    throw new InternalServerError(
      'useRateLimit hook requires a store to persist activity',
      {
        key: 'exo.rate-limit.misconfig'
      }
    );
  }

  const limit = await Promise.resolve(
    isFunction(limitFn) ? limitFn(props) : limitFn
  );
  const store = await Promise.resolve(
    storeFn ? (isFunction(storeFn) ? storeFn(props) : storeFn) : services.store
  );

  const [err, record] = await tryit(store.inc)(key);
  if (err) {
    logger?.error('[useRateLimit] Error on store.inc', { err, key });
    if (strict === false) return await func(props);
    throw new InternalServerError(
      'useRateLimit store threw an error while executing incrament operation',
      {
        key: 'exo.rate-limit.misconfig',
        cause: err
      }
    );
  }

  if (!record) {
    logger?.error('[useRateLimit] Store.inc returned nothing', { key });
    if (strict === false) return await func(props);
    throw new InternalServerError(
      'useRateLimit did not return a valid record',
      {
        key: 'exo.rate-limit.misconfig'
      }
    );
  }

  const { count, timestamp } = record;
  const elapsed = Date.now() - timestamp;
  const windowHasPassed = elapsed > dur(limit.window, 'milliseconds');

  const headers = {
    'X-RateLimit-Limit': `${limit.max}`,
    'X-RateLimit-Remaining': `${limit.max - count}`,
    'X-RateLimit-Reset': `${dur(limit.window, 'milliseconds') - elapsed}`
  };

  if (windowHasPassed) {
    await store.reset(key);
  } else {
    if (count > limit.max) {
      logger?.log('[useRateLimit] Rate limit exceeded', {
        key,
        count,
        timestamp,
        max: limit.max,
        window: limit.window
      });
      throw new RateLimitError('Too Many Requests', {
        key: 'exo.rate-limit.exceeded'
      });
    }
  }

  const [error, result] = await tryit(func)(props);
  const res = response(error, result);
  const responseWithHeaders = {
    ...res,
    headers: {
      ...res.headers,
      ...headers
    }
  };
  return responseWithHeaders;
}

/**
 * Creates a middleware that enforces rate limiting
 * @param {UseRateLimitOption} options - The rate limit options
 * @returns {(func: NextFunc) => (props: Props) => Promise<Response>}
 */
export const useRateLimit = (options) => (func) => (props) =>
  withRateLimiting(func, options, props);
