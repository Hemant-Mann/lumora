const NULL_VALUE = '__null__'

const isStringNull = (value) => value === NULL_VALUE
const isNullValue = (value) => value === null

/**
 * Tries to get a value from the cache, if it exists, otherwise execute the function and cache the result
 * @param {Object} redis
 * @returns {Function}
 */
export const tryit = (redis) => async ({ cacheKey, duration = '5 minutes' }, func) => {
  const value = await redis.get(cacheKey)
  if (value) {
    if (isStringNull(value)) return null
    return JSON.parse(value)
  }
  const result = await func()
  let cacheValue = isNullValue(result) ? NULL_VALUE : JSON.stringify(result)
  await redis.set(cacheKey, cacheValue, { ttl: duration })
  return result
}
