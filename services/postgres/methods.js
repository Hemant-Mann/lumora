import _ from 'lodash'
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
 * Applies filter conditions to a knex query builder
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
					const pattern = value.options === 'i' ? `%${val}%` : val
					if (value.options === 'i') {
						query.whereILike(key, pattern)
					} else {
						query.whereLike(key, pattern)
					}
					break
				case 'BETWEEN':
					if (Array.isArray(val) && val.length === 2) {
						query.whereBetween(key, [val[0], val[1]])
					}
					break
				case 'OR_OPERATOR':
					if (Array.isArray(val)) {
						query.where(function() {
							for (const v of val) {
								this.orWhere(function() {
									applyFilter(this, v)
								})
							}
						})
					}
					break
				case 'OR':
					if (Array.isArray(val)) {
						query.where(function() {
							for (const v of val) {
								this.orWhere(key, v)
							}
						})
					}
					break
				case 'AND':
					if (Array.isArray(val)) {
						query.where(function() {
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
				case 'TEXT_SEARCH':
					query.whereRaw('to_tsvector(??) @@ plainto_tsquery(?)', [key, val])
					break
				case 'ARRAY_CONTAINS_ALL':
					if (Array.isArray(val)) {
						query.whereRaw('?? @> ?::text[]', [key, JSON.stringify(val)])
					}
					break
				case 'ARRAY_CONTAINS_ANY':
					if (Array.isArray(val)) {
						query.whereRaw('?? && ?::text[]', [key, JSON.stringify(val)])
					}
					break
				case 'ARRAY_SIZE':
					query.whereRaw('array_length(??, 1) = ?', [key, val])
					break
				case 'IS_NULL':
					query.whereNull(key)
					break
				case 'IS_NOT_NULL':
					query.whereNotNull(key)
					break
				case 'IS_EMPTY':
					query.where(function() {
						this.whereNull(key)
							.orWhere(key, '')
							.orWhereRaw("?? = '[]'::jsonb", [key])
							.orWhereRaw("?? = '{}'::jsonb", [key])
					})
					break
				case 'IS_NOT_EMPTY':
					query.where(function() {
						this.whereNotNull(key)
							.andWhereNot(key, '')
							.andWhereNotRaw("?? = '[]'::jsonb", [key])
							.andWhereNotRaw("?? = '{}'::jsonb", [key])
					})
					break
				case 'STARTS_WITH':
					const startsPattern = value.options === 'i' ? `${val}%` : val
					if (value.options === 'i') {
						query.whereILike(key, startsPattern)
					} else {
						query.whereLike(key, startsPattern)
					}
					break
				case 'ENDS_WITH':
					const endsPattern = value.options === 'i' ? `%${val}` : val
					if (value.options === 'i') {
						query.whereILike(key, endsPattern)
					} else {
						query.whereLike(key, endsPattern)
					}
					break
				case 'CONTAINS':
					const containsPattern = value.options === 'i' ? `%${val}%` : val
					if (value.options === 'i') {
						query.whereILike(key, containsPattern)
					} else {
						query.whereLike(key, containsPattern)
					}
					break
				case 'NOT_CONTAINS':
					const notContainsPattern = value.options === 'i' ? `%${val}%` : val
					if (value.options === 'i') {
						query.whereNotILike(key, notContainsPattern)
					} else {
						query.whereNotLike(key, notContainsPattern)
					}
					break
				case 'IN_RANGE':
					if (Array.isArray(val) && val.length === 2) {
						query.whereBetween(key, [val[0], val[1]])
					}
					break
				case 'OUTSIDE_RANGE':
					if (Array.isArray(val) && val.length === 2) {
						query.where(function() {
							this.where(key, '<', val[0])
								.orWhere(key, '>', val[1])
						})
					}
					break
				case 'MODULO':
					if (val && typeof val === 'object' && 'divisor' in val && 'remainder' in val) {
						query.whereRaw('MOD(??, ?) = ?', [key, val.divisor, val.remainder])
					}
					break
				default:
					query.where(key, val)
					break
			}
		} else if (Array.isArray(value)) {
			// Handle array values (default to IN behavior)
			if (value.length > 0) {
				query.whereIn(key, value)
			}
		} else if (value && typeof value === 'object') {
			// Recursively handle nested objects (AND logic)
			query.where(function() {
				applyFilter(this, value)
			})
		} else {
			// Pass through simple values (equality)
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

		// Apply filters
		updateQuery = applyFilter(updateQuery, query)

		// Build update object
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
 * Upserts a single record in the database
 * @param {import('knex').Knex} db - Knex instance
 * @returns {(model: string, query: object, insertData: object) => Promise<[Error|null, boolean]>} A function that upserts a record in the database.
 */
export const upsert = (db) => async (model, query, insertData) => {
	const tableName = getTableName(model)

	const [err, result] = await tryit(async () => {
		// Build the data to insert (merge query and insertData)
		const result = await db(tableName)
			.insert(insertData)
			.onConflict()
			.ignore();

		return result.rowCount > 0;
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

		// Apply filters
		selectQuery = applyFilter(selectQuery, query)

		// Select specific fields if provided
		if (opts.fields && Array.isArray(opts.fields) && opts.fields.length > 0) {
			selectQuery = selectQuery.select(opts.fields)
		}

		// Apply sorting
		if (opts.sort) {
			for (const [key, value] of Object.entries(opts.sort)) {
				const direction = value === -1 || value === 'desc' || value === 'DESC' ? 'desc' : 'asc'
				selectQuery = selectQuery.orderBy(key, direction)
			}
		}

		// Apply timeout
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

		// Apply filters
		selectQuery = applyFilter(selectQuery, query)

		// Select specific fields if provided
		if (opts.fields && Array.isArray(opts.fields) && opts.fields.length > 0) {
			selectQuery = selectQuery.select(opts.fields)
		}

		// Apply pagination
		const limit = opts.per_page || opts.limit || 100
		const page = opts.page_no || opts.page || 1
		const skip = (page - 1) * limit

		if (limit) {
			selectQuery = selectQuery.limit(limit)
		}
		if (skip > 0) {
			selectQuery = selectQuery.offset(skip)
		}

		// Apply sorting
		if (opts.sort) {
			for (const [key, value] of Object.entries(opts.sort)) {
				const direction = value === -1 || value === 'desc' || value === 'DESC' ? 'desc' : 'asc'
				selectQuery = selectQuery.orderBy(key, direction)
			}
		}

		// Apply timeout
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

		// Apply filters
		updateQuery = applyFilter(updateQuery, query)

		// Apply timeout
		const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
		updateQuery = updateQuery.timeout(timeout)

		// Update fields
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

		// Apply filters
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

		// Apply filters
		deleteQuery = applyFilter(deleteQuery, query)

		// Apply timeout
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

		// Apply filters
		countQuery = applyFilter(countQuery, query)

		// Apply timeout
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
		// Execute operations in a transaction
		await db.transaction(async (trx) => {
			for (const op of ops) {
				if (op.insertOne) {
					const rows = await trx(tableName).insert(op.insertOne.document).returning('*')
					if (rows.length > 0) results.insertedCount++
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
					const updateClause = {}
					for (const key of Object.keys(op.upsert.update)) {
						updateClause[key] = trx.raw('EXCLUDED.??', [key])
					}
					const rows = await trx(tableName)
						.insert(allData)
						.onConflict('_id')
						.merge(updateClause)
						.returning('*')
					if (rows.length > 0) results.upsertedCount++
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
		const result = await db(tableName).insert(docs);
		return result.rowCount
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

		// Apply filters
		updateQuery = applyFilter(updateQuery, query)

		// Build update object
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

		// Apply timeout
		const timeout = opts.maxTimeMS || DEFAULT_MAX_TIME_MS
		updateQuery = updateQuery.timeout(timeout)

		const rows = await updateQuery.returning('*')
		return rows[0] || null
	})()

	if (err) return [err, null]
	return [null, result]
}
