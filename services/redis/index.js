import { createClient } from 'redis'
import createRedisClient from './client.js'
import _ from 'lodash'

let defRedisClientMap = {}

/**
 * Creates a Redis client with resilient connection handling
 * @param {string} name - Connection name
 * @param {string} redisUri - Redis connection URI
 * @returns {import('./types').RedisClient}
 */
export const makeRedisClient = (name, redisUri = '') => {
  if (defRedisClientMap[name]) {
    return defRedisClientMap[name]
  }
  if (_.isEmpty(redisUri)) {
    throw new Error('Redis URI cannot be empty')
  }

  const redisClient = createClient({
    url: redisUri,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: (retries) => {
        const maxRetries = 3
        const baseDelay = 100
        const maxDelay = 300

        if (retries > maxRetries) {
          console.error(`[Redis:${name}] Max reconnection attempts (${maxRetries}) reached. Giving up.`)
          return false
        }

        const delay = Math.min(baseDelay * Math.pow(1.5, retries), maxDelay)
        console.warn(`[Redis:${name}] Reconnecting attempt ${retries}/${maxRetries} in ${delay}ms...`)
        return delay
      }
    }
  })

  redisClient.on('error', (err) => {
    const isSocketError = err.message && (
      err.message.includes('Socket closed unexpectedly') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT')
    )

    if (isSocketError) {
      console.warn(`[Redis:${name}] Connection error (will retry): ${err.message}`)
    } else {
      console.error(`[Redis:${name}] Unexpected error:`, err)
    }
  })

  redisClient.on('connect', () => {
    console.log(`[Redis:${name}] Client connected`)
  })

  redisClient.on('ready', () => {
    console.log(`[Redis:${name}] Client ready`)
  })

  redisClient.on('reconnecting', () => {
    console.log(`[Redis:${name}] Client reconnecting...`)
  })

  redisClient.on('end', () => {
    console.log(`[Redis:${name}] Client connection closed`)
  })

  const client = createRedisClient(redisClient)
  defRedisClientMap[name] = client
  return client
}

/**
 * Disconnect from Redis
 * @param {string} name - Connection name
 */
export const disconnectRedis = async (name) => {
  try {
    const client = defRedisClientMap[name]
    if (client) {
      await client.disconnect()
    }
  } catch (error) {
    console.error(`[Redis:${name}] Error disconnecting:`, error)
  }
}
