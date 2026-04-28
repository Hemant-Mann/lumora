import { tryit } from 'radash'

const DEFAULT_MAX_TIME_MS = 5000

/**
 * Converts a model name to a table name (snake_case)
 * @param {string} model
 * @returns {string}
 */
const getTableName = (model) => {
  return model.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
}

/**
 * Applies filter conditions to a knex query builder (MySQL-compatible)
 * Core relational subset — no Postgres/SQLite-specific operators
 * @param {import('knex').Knex.QueryBuilder} query - Knex query builder
 * @param {Object} filter - The filter object with custom operators
 * @returns {import('knex').Knex.QueryBuilder}
 */
const applyFilter = (query, filter) => {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return query
  }

  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && 'operator' in value) {
      const operator = value.operator.toUpperCase()
      const val = value.value

      switch (operator) {
        case 'IN':
          if (Array.isArray(val) && val.length > 0) {
            query.whereIn(key, val)
          }
          break
        case 'NIN':
        case 'NOT_IN':
          if (Array.isArray(val) && val.length > 0) {
            query.whereNotIn(key, val)
          } else {
            query.whereNot(key, val)
          }
          break
        case 'GT':
          query.where(key, '>', val)
          break
        case 'GTE':
          query.where(key, '>=', val)
          break
        case 'LT':
          query.where(key, '<', val)
          break
        case 'LTE':
          query.where(key, '<=', val)
          break
        case 'NE':
        case 'NOT_EQUAL':
          query.whereNot(key, val)
          break
        case 'EXISTS':
          if (val) {
            query.whereNotNull(key)
          } else {
            query.whereNull(key)
          }
          break
        case 'REGEX':
        case 'LIKE':
          query.whereLike(key, value.options === 'i' ? `%${val}%` : val)
          break
        case 'BETWEEN':
          if (Array.isArray(val) && val.length === 2) {
            query.whereBetween(key, [val[0], val[1]])
          }
          break
        case 'OR_OPERATOR':
          if (Array.isArray(val)) {
            query.where(function () {
              for (const v of val) {
                this.orWhere(function () {
                  applyFilter(this, v)
                })
              }
            })
          }
          break
        case 'OR':
          if (Array.isArray(val)) {
            query.where(function () {
              for (const v of val) {
                this.orWhere(key, v)
              }
            })
          }
          break
        case 'AND':
          if (Array.isArray(val)) {
            query.where(function () {
              for (const v of val) {
                this.andWhere(key, v)
              }
            })
          }
          break
        case 'DATE_RANGE':
          if (val && typeof val === 'object') {
            const { start, end } = val
            if (start && end) {
              query.whereBetween(key, [new Date(start), new Date(end)])
            } else if (start) {
              query.where(key, '>=', new Date(start))
            } else if (end) {
              query.where(key, '<=', new Date(end))
            }
          }
          break
        case 'IS_NULL':
          query.whereNull(key)
          break
        case 'IS_NOT_NULL':
          query.whereNotNull(key)
          break
        case 'STARTS_WITH':
          query.whereLike(key, value.options === 'i' ? `${val}%` : val)
          break
        case 'ENDS_WITH':
          query.whereLike(key, value.options === 'i' ? `%${val}` : val)
          break
        case 'CONTAINS':
          query.whereLike(key, value.options === 'i' ? `%${val}%` : `%${val}%`)
          break
        case 'NOT_CONTAINS':
          query.whereNotLike(key, value.options === 'i' ? `%${val}%` : `%${val}%`)
          break
        case 'IN_RANGE':
          if (Array.isArray(val) && val.length === 2) {
            query.whereBetween(key, [val[0], val[1]])
          }
          break
        case 'OUTSIDE_RANGE':
          if (Array.isArray(val) && val.length === 2) {
            query.where(function () {
              this.where(key, '<', val[0])
                .orWhere(key, '>', val[1])
            })
          }
          break
        default:
          query.where(key, val)
          break
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        query.whereIn(key, value)
      }
    } else if (value && typeof value === 'object') {
      query.where(function () {
        applyFilter(this, value)
      })
    } else {
      query.where(key, value)
    }
  }

  return query
}

/**
 * Inserts a single record into the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, record: object) => Promise<[Error|null, object|null]>} A function that inserts a record into the database.
 */
export const insertOne = (db) => async (model, record) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    const rows = await db(tableName).insert(record).returning('*')
    return rows[0] || null
  })()

  if (err) return [err, null]
  return [null, result]
}

/**
 * Updates a single record in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, updateData: object) => Promise<[Error|null, boolean]>} A function that updates a record in the database.
 */
export const updateOne = (db) => async (model, query, updateObj) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    let updateQuery = db(tableName)

    updateQuery = applyFilter(updateQuery, query)

    const updateData = {}
    if (updateObj.increment) {
      for (const [key, value] of Object.entries(updateObj.increment)) {
        updateQuery = updateQuery.increment(key, value)
      }
    }
    if (updateObj.set) {
      Object.assign(updateData, updateObj.set)
    }

    if (Object.keys(updateData).length === 0 && !updateObj.increment) {
      throw new Error('Update data is empty')
    }

    if (Object.keys(updateData).length > 0) {
      updateQuery = updateQuery.update(updateData)
    }

    const rowCount = await updateQuery
    return rowCount === 1 || rowCount > 0
  })()

  if (err) return [err, false]
  return [null, result]
}

/**
 * Upserts a single record in the database (MySQL: ON CONFLICT / INSERT IGNORE)
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, insertData: object) => Promise<[Error|null, boolean]>} A function that upserts a record in the database.
 */
export const upsert = (db) => async (model, query, insertData) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    const insertResult = await db(tableName)
      .insert(insertData)
      .onConflict()
      .ignore()

    const rowCount = Array.isArray(insertResult) ? insertResult.length : (insertResult ?? 0)
    return rowCount > 0
  })()

  return [err, result]
}

/**
 * Finds a single record in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, opts?: object) => Promise<[Error|null, object|null]>} A function that finds a record in the database.
 */
export const selectOne = (db) => async (model, query, opts = {}) => {
  const tableName = getTableName(model)

  const [err, record] = await tryit(async () => {
    let selectQuery = db(tableName)

    selectQuery = applyFilter(selectQuery, query)

    if (opts.fields && Array.isArray(opts.fields) && opts.fields.length > 0) {
      selectQuery = selectQuery.select(opts.fields)
    }

    if (opts.sort) {
      for (const [key, value] of Object.entries(opts.sort)) {
        const direction = value === -1 || value === 'desc' || value === 'DESC' ? 'desc' : 'asc'
        selectQuery = selectQuery.orderBy(key, direction)
      }
    }

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    selectQuery = selectQuery.timeout(timeout)

    const rows = await selectQuery.limit(1)
    return rows[0] || null
  })()

  if (err) return [err, null]
  return [null, record]
}

/**
 * Finds a single record by id in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, id: string) => Promise<[Error|null, object|null]>} A function that finds a record by id in the database.
 */
export const selectViaId = (db) => async (model, id) => {
  return selectOne(db)(model, { _id: id })
}

/**
 * Finds many records in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, opts?: object) => Promise<[Error|null, object[]|null]>} A function that finds many records in the database.
 */
export const selectMany = (db) => async (model, query, opts = {}) => {
  const tableName = getTableName(model)

  const [err, records] = await tryit(async () => {
    let selectQuery = db(tableName)

    selectQuery = applyFilter(selectQuery, query)

    if (opts.fields && Array.isArray(opts.fields) && opts.fields.length > 0) {
      const fieldList = opts.fields.map((f) => {
        if (typeof f === 'string') return f
        if (f && typeof f === 'object') {
          if (f.raw) return db.raw(f.raw)
          if (f.key && f.alias) return `${f.key} as ${f.alias}`
          if (f.key) return f.key
        }
        return f
      })
      selectQuery = selectQuery.select(fieldList)
    }

    // Apply GROUP BY
    if (opts.groupBy) {
      if (typeof opts.groupBy === 'string') {
        selectQuery = selectQuery.groupBy(opts.groupBy)
      } else if (Array.isArray(opts.groupBy)) {
        for (const g of opts.groupBy) {
          if (typeof g === 'string') {
            selectQuery = selectQuery.groupBy(g)
          } else if (g && typeof g === 'object') {
            if (g.raw) {
              selectQuery = selectQuery.groupByRaw(g.raw)
            } else if (g.key) {
              selectQuery = selectQuery.groupBy(g.key)
            }
          }
        }
      } else if (opts.groupBy.raw) {
        selectQuery = selectQuery.groupByRaw(opts.groupBy.raw)
      } else if (opts.groupBy.key) {
        selectQuery = selectQuery.groupBy(opts.groupBy.key)
      }
    }

    const limit = opts.per_page || opts.limit || 100
    const page = opts.page_no || opts.page || 1
    const skip = (page - 1) * limit

    if (limit) {
      selectQuery = selectQuery.limit(limit)
    }
    if (skip > 0) {
      selectQuery = selectQuery.offset(skip)
    }

    if (opts.sort) {
      for (const [key, value] of Object.entries(opts.sort)) {
        const direction = value === -1 || value === 'desc' || value === 'DESC' ? 'desc' : 'asc'
        selectQuery = selectQuery.orderBy(key, direction)
      }
    }

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    selectQuery = selectQuery.timeout(timeout)

    return await selectQuery
  })()

  if (err) return [err, null]
  return [null, records || []]
}

/**
 * Updates many records in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, updateFields: object) => Promise<[Error|null, object|null]>} A function that updates many records in the database.
 */
export const updateMany = (db) => async (model, query, updateFields, opts = {}) => {
  const tableName = getTableName(model)

  const [err, res] = await tryit(async () => {
    if (Object.keys(updateFields).length === 0) {
      throw new Error('Update fields are empty')
    }

    let updateQuery = db(tableName)

    updateQuery = applyFilter(updateQuery, query)

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    updateQuery = updateQuery.timeout(timeout)

    const rowCount = await updateQuery.update(updateFields).returning('*')
    return { rowCount: Array.isArray(rowCount) ? rowCount.length : rowCount, rows: Array.isArray(rowCount) ? rowCount : [] }
  })()

  if (err) return [err, null]
  return [null, res]
}

/**
 * Deletes a single record in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object) => Promise<[Error|null, boolean]>} A function that deletes a record in the database.
 */
export const deleteOne = (db) => async (model, query) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    let deleteQuery = db(tableName)

    deleteQuery = applyFilter(deleteQuery, query)

    const rowCount = await deleteQuery.limit(1).del()
    return rowCount === 1
  })()

  if (err) return [err, false]
  return [null, result]
}

/**
 * Deletes multiple records in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object) => Promise<[Error|null, boolean]>} A function that deletes records in the database.
 */
export const deleteMany = (db) => async (model, query, opts = {}) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    let deleteQuery = db(tableName)

    deleteQuery = applyFilter(deleteQuery, query)

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    deleteQuery = deleteQuery.timeout(timeout)

    const rowCount = await deleteQuery.del()
    return rowCount > 0
  })()

  if (err) return [err, false]
  return [null, result]
}

/**
 * Counts documents based on query passed in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object) => Promise<[Error|null, number|null]>} A function that counts documents
 */
export const countDocuments = (db) => async (model, query, opts = {}) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    let countQuery = db(tableName)

    countQuery = applyFilter(countQuery, query)

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    countQuery = countQuery.timeout(timeout)

    const countResult = await countQuery.count('* as count').first()
    return parseInt(countResult?.count || 0, 10)
  })()

  if (err) return [err, null]
  return [null, result || 0]
}

/**
 * Bulk writes to the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, ops: object[]) => Promise<[Error|null, object|null]>} A function that bulk writes to the database.
 */
export const bulkWrite = (db) => async (model, ops, opts = {}) => {
  const tableName = getTableName(model)
  const results = {
    insertedCount: 0,
    matchedCount: 0,
    modifiedCount: 0,
    deletedCount: 0,
    upsertedCount: 0
  }

  const [err, result] = await tryit(async () => {
    await db.transaction(async (trx) => {
      for (const op of ops) {
        if (op.insertOne) {
          const rows = await trx(tableName).insert(op.insertOne.document).returning('*')
          if (rows && rows.length > 0) results.insertedCount++
        } else if (op.updateOne) {
          let updateQuery = trx(tableName)
          updateQuery = applyFilter(updateQuery, op.updateOne.filter)
          const rowCount = await updateQuery.update(op.updateOne.update)
          if (rowCount > 0) {
            results.matchedCount++
            results.modifiedCount++
          }
        } else if (op.deleteOne) {
          let deleteQuery = trx(tableName)
          deleteQuery = applyFilter(deleteQuery, op.deleteOne.filter)
          const rowCount = await deleteQuery.limit(1).del()
          if (rowCount > 0) results.deletedCount++
        } else if (op.replaceOne) {
          let updateQuery = trx(tableName)
          updateQuery = applyFilter(updateQuery, op.replaceOne.filter)
          const rowCount = await updateQuery.update(op.replaceOne.replacement)
          if (rowCount > 0) {
            results.matchedCount++
            results.modifiedCount++
          }
        } else if (op.upsert) {
          const allData = { ...op.upsert.filter, ...op.upsert.update }
          const rows = await trx(tableName)
            .insert(allData)
            .onConflict()
            .merge()
            .returning('*')
          if (rows && rows.length > 0) results.upsertedCount++
        }
      }
    })

    return results
  })()

  if (err) return [err, null]
  return [null, result]
}

/**
 * Inserts many records into the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, docs: object[], opts?: object) => Promise<[Error|null, object|null]>} A function that inserts many records into the database.
 */
export const insertMany = (db) => async (model, docs, opts = {}) => {
  if (!docs || docs.length === 0) {
    return [null, []]
  }

  const tableName = getTableName(model)

  const [err, rowCount] = await tryit(async () => {
    const result = await db(tableName).insert(docs)
    return Array.isArray(result) ? result.length : (result ?? 0)
  })()

  if (err) return [err, null]
  return [null, rowCount]
}

/**
 * Finds a single record and updates it in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, updateData: object, opts?: object) => Promise<[Error|null, object|null]>} A function that finds a single record and updates it in the database.
 */
export const selectOneAndUpdate = (db) => async (model, query, updateData, opts = {}) => {
  const tableName = getTableName(model)

  const [err, result] = await tryit(async () => {
    let updateQuery = db(tableName)

    updateQuery = applyFilter(updateQuery, query)

    const updateObj = {}
    if (updateData.increment) {
      for (const [key, value] of Object.entries(updateData.increment)) {
        updateQuery = updateQuery.increment(key, value)
      }
    }
    if (updateData.set) {
      Object.assign(updateObj, updateData.set)
    }

    if (Object.keys(updateObj).length === 0 && !updateData.increment) {
      throw new Error('Update data is empty')
    }

    if (Object.keys(updateObj).length > 0) {
      updateQuery = updateQuery.update(updateObj)
    }

    const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
    updateQuery = updateQuery.timeout(timeout)

    const rows = await updateQuery.returning('*')
    return rows[0] || null
  })()

  if (err) return [err, null]
  return [null, result]
}
