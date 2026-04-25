import { hash, selectOne, selectViaId, selectMany, clearCacheForId, clearCacheForQuery, buildKey } from './client.js'

/**
 * Creates a cache client
 * @param {Object} db - Database client (MySQL or MongoDB)
 * @param {import('../redis/types').RedisClient} redis - Redis client
 * @param {string} [cachePrefix='__lumora__'] - Cache key prefix
 * @returns {import('./types').CacheClient}
 */
const makeCacheClient = (db, redis, cachePrefix = '__lumora__') => {
  const getKey = buildKey(cachePrefix)
  return {
    hash,
    selectOne: selectOne({db, redis, getKey}),
    selectViaId: selectViaId({db, redis, getKey}),
    selectMany: selectMany({db, redis, getKey}),
    clearCacheForId: clearCacheForId({redis, getKey}),
    clearCacheForQuery: clearCacheForQuery({redis, getKey}),
  }
}

export default makeCacheClient
