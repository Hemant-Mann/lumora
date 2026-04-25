/**
 * @typedef {Object} RedisDatabaseConfig
 * @property {string} redisUri - Redis connection URI
 */

/**
 * @typedef {({cacheKey: string, duration?: string}, func: () => Promise<any>) => Promise<any>} TryitFunc
 * A function that tries to get a value from the cache, if it exists, otherwise execute the function and cache the result
 */

/**
 * @typedef {Object} RedisClient
 * @property {() => Promise<void>} connect - Connect to the redis server
 * @property {(key: string) => Promise<string|null>} get - Get a value from redis
 * @property {(key: string, value: string, options?: object|number) => Promise<any>} set - Set a value in redis
 * @property {() => Promise<void>} disconnect - Disconnect from redis
 * @property {() => boolean} isConnected - Check if redis is connected
 * @property {TryitFunc} tryit - Cache-aside helper
 * @property {(key: string, value: number) => Promise<number|null>} incr - Increment a key value
 * @property {(key: string, field: string, value: number) => Promise<number|null>} hincrby - Increment a hash field
 * @property {(key: string) => Promise<Object>} hgetall - Get all fields in a hash
 * @property {(key: string, ttl: string|number) => Promise<boolean>} expire - Set key expiration
 * @property {(key: string) => Promise<number>} ttl - Get key TTL
 * @property {(key: string) => Promise<number>} del - Delete a key
 * @property {(key: string, score: number, member: string) => Promise<number>} zadd - Add to sorted set
 */

export {}
