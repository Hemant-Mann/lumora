/**
 * @typedef {(model: string, query: object) => Promise<[Error|null, object|null]>} FindOneFunc
 * A function that finds a single record in the cache, if it exists, otherwise fetch from the database and cache the result
 */

/**
 * @typedef {(model: string, id: string) => Promise<[Error|null, object|null]>} FindByIdFunc
 * A function that finds a single record by id in the cache, if it exists, otherwise fetch from the database and cache the result
 */

/**
 * @typedef {(model: string, query: object, fields?: string[]) => Promise<[Error|null, object[]|null]>} FindManyFunc
 * A function that finds many records in the cache, if they exist, otherwise fetch from the database and cache the result
 */

/**
 * @typedef {Object} CacheClient
 * @property {(obj: object) => string} hash - Hash an object into a deterministic string
 * @property {FindOneFunc} selectOne - Cache-first select one
 * @property {FindByIdFunc} selectViaId - Cache-first select by id
 * @property {FindManyFunc} selectMany - Cache-first select many
 * @property {(model: string, id: string) => Promise<number>} clearCacheForId - Clear cache for a specific id
 * @property {(model: string, query: object) => Promise<number>} clearCacheForQuery - Clear cache for a specific query
 */

/**
 * @typedef {Object} CacheClientOptions
 * @property {Object} db - Database client (MySQL or MongoDB)
 * @property {import('../redis/types').RedisClient} redis - Redis client
 * @property {Function} getKey - Key builder function
 */

export {}
