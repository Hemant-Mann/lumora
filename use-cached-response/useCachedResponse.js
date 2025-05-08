import { hook } from '../core';
import dur from 'durhuman';
import { crush, mapValues, tryit } from 'radash';
import * as uuid from 'uuid';

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} ICache
 * @property {(key: string) => Promise<any>} get
 * @property {(key: string, value: any, ttl: number) => Promise<void>} set
 */

/**
 * @typedef {Object} ICacheLogger
 * @property {(...args: any[]) => void} log
 * @property {(...args: any[]) => void} warn
 * @property {(...args: any[]) => void} error
 */

/**
 * @typedef {Object} UseCachedResponseOptions
 * @property {string} key - A string unique to the items you are using this hook to cache.
 * @property {string} ttl - Time to live. The amount of time before we should consider an item in the cache to be fresh.
 * @property {ICacheLogger} [logger] - If passed, the hook will log information about the caching using this object.
 * @property {string} [header] - In some cases, it can be useful to override the cache and force the endpoint to do the work again.
 * @property {string} [value] - The header value that will force the hook to skip the cache.
 * @property {(args: any) => any} [toIdentity] - A mapping function to convert the args into an object that should be used to generate the cache key.
 * @property {(response: any) => string} [toCache] - A mapping function to convert a response object into a string that can be stored in the cache.
 * @property {(cached: string) => any} [toResponse] - A mapping function to convert a stored cache string back into a response object.
 */

const defaults = {
  ttl: '1 hour',
  toIdentity: a => a,
  toCache: r => JSON.stringify(r),
  toResponse: c => JSON.parse(c)
};

const hash = (obj) =>
  uuid.v5(
    JSON.stringify(
      mapValues(crush(obj), (value) => {
        if (value === null) return '__null__';
        if (value === undefined) return '__undefined__';
        return value;
      })
    ),
    uuid.v5.DNS
  );

/**
 * @param {UseCachedResponseOptions} options
 * @returns {(func: (props: Props) => Promise<any>) => (props: Props) => Promise<any>}
 */
export const useCachedResponse = (options) =>
  hook(function useCachedResponse(func) {
    return async props => {
      const {
        key: prefix,
        toIdentity,
        toResponse,
        toCache,
        ttl,
        logger,
        header,
        value
      } = { ...defaults, ...options };

      const identity = toIdentity(props);
      const cacheKey = `${prefix}:${hash(identity)}`;

      if (header && props.request.headers[header] === value) {
        logger?.log('Cache skip requested');
        return await func(props);
      }

      const [err, cached] = await tryit(async () => {
        const cached = await props.services.cache.get(cacheKey);
        if (!cached) return null;
        return toResponse(cached);
      })();

      if (err) {
        logger?.error('Cache read error', err);
        return await func(props);
      }

      if (cached) {
        logger?.log('Cache hit');
        return cached;
      }

      logger?.log('Cache miss');
      const response = await func(props);
      const [setErr] = await tryit(async () => {
        const seconds = dur(ttl).seconds();
        await props.services.cache.set(cacheKey, toCache(response), seconds);
      })();

      if (setErr) {
        logger?.error('Cache write error', setErr);
      }

      return response;
    };
  });
