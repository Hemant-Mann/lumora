import _ from 'lodash'
import * as uuid from 'uuid'
import { crush, mapValues, tryit } from 'radash'

const NULL_VALUE = '__null__'
const UNDEFINED_VALUE = '__undefined__'

const defaultTTL = '5 minutes'

export const hash = (obj) =>
  uuid.v5(
    JSON.stringify(
      mapValues(crush(obj), (value) => {
        if (value === null) return NULL_VALUE
        if (value === undefined) return UNDEFINED_VALUE
        if (value instanceof RegExp) return value.toString()
        return value
      })
    ),
    uuid.v5.DNS
  )

const isStringNull = (value) => value === NULL_VALUE
const isNullValue = (value) => value === null

export const buildKey = (prefix) => (model, query, fields = []) => {
  if (_.isEmpty(fields)) {
    return `${prefix}:${model}:${hash(query)}`
  }
  return `${prefix}:${model}:${hash({q: query, f: fields})}`
}

/**
 * Finds a single record by id, if it exists in the cache, otherwise fetch from the database and cache the result
 * @param {import('./types').CacheClientOptions} opts
 * @returns {import('./types').FindByIdFunc}
 */
export const selectViaId = ({db, redis, getKey}) => async (model, id) => {
  return selectOne({db, redis, getKey})(model, { _id: id })
}

const tryCache = async ({redis, cacheKey, duration = '5 minutes'}, func) => {
  const value = await redis.get(cacheKey)
  if (value) {
    if (isStringNull(value)) return null
    return JSON.parse(value)
  }
  const result = await func()
  let cacheValue = isNullValue(result) || _.isEmpty(result) ? NULL_VALUE : JSON.stringify(result)
  await redis.set(cacheKey, cacheValue, { ttl: duration })
  return result
}

export const clearCacheForId = ({redis, getKey}) => async (model, id) => {
  const key = getKey(model, { _id: id })
  return await redis.del(key)
}

export const clearCacheForQuery = ({redis, getKey}) => async (model, query) => {
  const key = getKey(model, query)
  return await redis.del(key)
}

/**
 * Finds a single record, if it exists in the cache, otherwise fetch from the database and cache the result
 * @param {import('./types').CacheClientOptions} opts
 * @returns {import('./types').FindOneFunc}
 */
export const selectOne = ({db, redis, getKey}) => async (model, query) => {
  const key = getKey(model, query)

  const [err, record] = await tryit(async () => {
    return tryCache({redis, cacheKey: key, duration: defaultTTL}, async () => {
      const [err, record] = await db.selectOne(model, query)
      if (err) {
        throw err
      }
      return record
    })
  })()
  if (err) return [err, null]
  return [null, record]
}

/**
 * Finds many records, if they exist in the cache, otherwise fetch from the database and cache the result
 * @param {import('./types').CacheClientOptions} opts
 * @returns {import('./types').FindManyFunc}
 */
export const selectMany = ({db, redis, getKey}) => async (model, query, fields = []) => {
  const key = getKey(model, query, fields)
  const [err, records] = await tryit(async () => {
    return tryCache({redis, cacheKey: key, duration: defaultTTL}, async () => {
      const [err, records] = await db.selectMany(model, query, { fields })
      if (err) {
        throw err
      }
      return records
    })
  })()
  if (err) return [err, null]
  return [null, records]
}
