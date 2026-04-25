import { tryit as tryitFunc } from './methods.js'
import dur from 'durhuman'

/**
 * Create a Redis client with resilient error handling
 * @param {import('redis').RedisClientType} redis
 * @returns {import('./types').RedisClient}
 */
export const createRedisClient = (redis) => {
  let connected = false
  let connectionPromise = null

  const handleRedisError = (operation, err) => {
    const isConnectionError = err.message && (
      err.message.includes('Socket closed unexpectedly') ||
      err.message.includes('The client is closed') ||
      err.message.includes('Connection timeout') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT')
    )

    if (isConnectionError) {
      connected = false
      console.warn(`[Redis] ${operation} failed - connection unavailable: ${err.message}`)
    } else {
      console.error(`[Redis] ${operation} error:`, err)
    }
  }

  return {
    connect: async function connect() {
      if (connected) return
      if (redis.isReady) {
        connected = true
        return
      }

      if (connectionPromise) {
        return connectionPromise
      }

      connectionPromise = (async () => {
        try {
          await redis.connect()
          connected = true
        } catch (e) {
          if (/already open/.test(e.message) || /already connecting/.test(e.message)) {
            connected = true
          } else {
            handleRedisError('Connect', e)
          }
        } finally {
          connectionPromise = null
        }
      })()

      return connectionPromise
    },

    get: async function get(key) {
      try {
        await this.connect()
        if (!connected) return null
        return await redis.get(key)
      } catch (err) {
        handleRedisError('GET', err)
        return null
      }
    },

    set: async function set(key, value, options) {
      try {
        await this.connect()
        if (!connected) return null
        let redisOpts = {}
        if (typeof options === 'number') {
          redisOpts.EX = options
        } else if (options && typeof options === 'object') {
          redisOpts.EX = options.ttl ? dur(options.ttl) : undefined
          redisOpts.NX = options.nx || undefined
        }
        if (Object.keys(redisOpts).length === 0) {
          redisOpts = undefined
        }
        return await redis.set(key, value, redisOpts)
      } catch (err) {
        handleRedisError('SET', err)
        return null
      }
    },

    disconnect: async function disconnect() {
      if (!connected) return
      try {
        connected = false
        await redis.close()
      } catch (e) {
        if (/The client is closed/.test(e.message)) {
          connected = false
        } else {
          handleRedisError('Disconnect', e)
        }
      }
    },

    isConnected: () => redis.isReady,

    tryit: async function tryit(opts, func) {
      try {
        return await tryitFunc(this)(opts, func)
      } catch (err) {
        handleRedisError('TRYIT', err)
        return await func()
      }
    },

    incr: async function incr(key, value) {
      try {
        await this.connect()
        if (!connected) return null
        return await redis.incrByFloat(key, value)
      } catch (err) {
        handleRedisError('INCR', err)
        return null
      }
    },

    hincrby: async function hincrby(key, field, value) {
      try {
        await this.connect()
        if (!connected) return null
        return await redis.hIncrByFloat(key, field, value)
      } catch (err) {
        handleRedisError('HINCRBY', err)
        return null
      }
    },

    hgetall: async function hgetall(key) {
      try {
        await this.connect()
        if (!connected) return {}
        return await redis.hGetAll(key)
      } catch (err) {
        handleRedisError('HGETALL', err)
        return {}
      }
    },

    expire: async function expire(key, ttl) {
      try {
        await this.connect()
        if (!connected) return false
        const duration = typeof ttl === 'number' ? ttl : dur(ttl)
        return await redis.expire(key, duration)
      } catch (err) {
        handleRedisError('EXPIRE', err)
        return false
      }
    },

    ttl: async function ttl(key) {
      try {
        await this.connect()
        if (!connected) return false
        return await redis.ttl(key)
      } catch (err) {
        handleRedisError('TTL', err)
        return 0
      }
    },

    del: async function del(key) {
      try {
        await this.connect()
        if (!connected) return 0
        return await redis.del(key)
      } catch (err) {
        handleRedisError('DEL', err)
        return 0
      }
    },

    zadd: async function zadd(key, score, member) {
      try {
        await this.connect()
        if (!connected) return 0
        return await redis.zAdd(key, score, member)
      } catch (err) {
        handleRedisError('ZADD', err)
        return 0
      }
    },
  }
}

export default createRedisClient
