import { tryit } from 'radash'
import _ from 'lodash'
import { Types } from 'mongoose'

const DEFAULT_MAX_TIME_MS = 5000

/**
 * Get a model from the connection
 * @param {import('mongoose').Connection} conn
 * @param {string} m
 * @returns {import('mongoose').Model}
 */
const getModel = (conn, m) => conn.model(m)

/**
 * Transforms filter objects with custom operators to MongoDB query format
 * @param {Object} filter - The filter object with custom operators
 * @returns {Object} - MongoDB query object
 */
const transformFilter = (filter) => {
	if (!filter || typeof filter !== 'object') {
	  return filter;
	}
  
	const transformed = {};
	
	for (const [key, value] of Object.entries(filter)) {
		if (value && typeof value === 'object' && 'operator' in value) {
			// Handle custom operators
			switch (value.operator.toUpperCase()) {
				case 'IN':
					transformed[key] = { $in: value.value };
					break;
				case 'NIN':
				case 'NOT_IN':
					transformed[key] = { $nin: value.value };
					break;
				case 'GT':
					transformed[key] = { $gt: value.value };
					break;
				case 'GTE':
					transformed[key] = { $gte: value.value };
					break;
				case 'LT':
					transformed[key] = { $lt: value.value };
					break;
				case 'LTE':
					transformed[key] = { $lte: value.value };
					break;
				case 'NE':
				case 'NOT_EQUAL':
					transformed[key] = { $ne: value.value };
					break;
				case 'EXISTS':
					transformed[key] = { $exists: value.value };
					break;
				case 'REGEX':
				case 'LIKE':
					transformed[key] = { $regex: value.value, $options: value.options || 'i' };
					break;
				case 'BETWEEN':
					if (Array.isArray(value.value) && value.value.length === 2) {
						transformed[key] = { $gte: value.value[0], $lte: value.value[1] };
					}
					break;
				case 'OR_OPERATOR':
					transformed['$or'] = [];
					_.each(value.value, (v) => {
						transformed['$or'].push(transformFilter(v));
					})
					break;
				case 'OR':
					if (Array.isArray(value.value)) {
						transformed[key] = { $or: value.value.map(v => ({ [key]: v })) };
					}
					break;
				case 'AND':
					if (Array.isArray(value.value)) {
						transformed[key] = { $and: value.value.map(v => ({ [key]: v })) };
					}
					break;
				case 'DATE_RANGE':
					if (value.value && typeof value.value === 'object') {
						const { start, end } = value.value;
						const dateQuery = {};
						if (start) dateQuery.$gte = new Date(start);
						if (end) dateQuery.$lte = new Date(end);
						if (Object.keys(dateQuery).length > 0) {
							transformed[key] = dateQuery;
						}
					}
					break;
				case 'TEXT_SEARCH':
					transformed[key] = { $text: { $search: value.value } };
					break;
				case 'ARRAY_CONTAINS_ALL':
					transformed[key] = { $all: value.value };
					break;
				case 'ARRAY_CONTAINS_ANY':
					transformed[key] = { $in: value.value };
					break;
				case 'ARRAY_SIZE':
					transformed[key] = { $size: value.value };
					break;
				case 'ARRAY_ELEM_MATCH':
					transformed[key] = { $elemMatch: value.value };
					break;
				case 'IS_NULL':
					transformed[key] = { $in: [null, []] };
					break;
				case 'IS_NOT_NULL':
					transformed[key] = { $ne: null };
					break;
				case 'IS_EMPTY':
					transformed[key] = { $in: [null, '', [], {}] };
					break;
				case 'IS_NOT_EMPTY':
					transformed[key] = { $nin: [null, '', [], {}] };
					break;
				case 'STARTS_WITH':
					transformed[key] = { $regex: `^${value.value}`, $options: value.options || 'i' };
					break;
				case 'ENDS_WITH':
					transformed[key] = { $regex: `${value.value}$`, $options: value.options || 'i' };
					break;
				case 'CONTAINS':
					transformed[key] = { $regex: value.value, $options: value.options || 'i' };
					break;
				case 'NOT_CONTAINS':
					transformed[key] = { $not: { $regex: value.value, $options: value.options || 'i' } };
					break;
				case 'IN_RANGE':
					if (Array.isArray(value.value) && value.value.length === 2) {
						transformed[key] = { $gte: value.value[0], $lte: value.value[1] };
					}
					break;
				case 'OUTSIDE_RANGE':
					if (Array.isArray(value.value) && value.value.length === 2) {
						transformed[key] = { 
							$or: [
								{ [key]: { $lt: value.value[0] } },
								{ [key]: { $gt: value.value[1] } }
							]
						};
					}
					break;
				case 'MODULO':
					if (value.value && typeof value.value === 'object' && 'divisor' in value.value && 'remainder' in value.value) {
						transformed[key] = { $mod: [value.value.divisor, value.value.remainder] };
					}
					break;
				case 'TYPE':
					transformed[key] = { $type: value.value };
					break;
				case 'EXPR':
					transformed[key] = { $expr: value.value };
					break;
				case 'GEO_WITHIN':
					transformed[key] = { $geoWithin: value.value };
					break;
				case 'GEO_INTERSECTS':
					transformed[key] = { $geoIntersects: value.value };
					break;
				case 'NEAR':
					transformed[key] = { $near: value.value };
					break;
				case 'NEAR_SPHERE':
					transformed[key] = { $nearSphere: value.value };
					break;
				case 'MAX_DISTANCE':
					if (value.value && typeof value.value === 'object' && 'coordinates' in value.value && 'maxDistance' in value.value) {
						transformed[key] = { 
							$near: {
								$geometry: { type: "Point", coordinates: value.value.coordinates },
								$maxDistance: value.value.maxDistance
							}
						};
					}
					break;
				default:
					// If operator is not recognized, pass through as-is
					transformed[key] = value.value;
					break;
			}
		} else if (Array.isArray(value)) {
			// Handle array values (default to $in behavior)
			transformed[key] = { $in: value };
		} else if (value && typeof value === 'object' && !(value instanceof Types.ObjectId)) {
			// Recursively transform nested objects
			transformed[key] = transformFilter(value);
		} else {
			// Pass through simple values
			transformed[key] = value;
		}
	}
	
	return transformed;
};

/**
 * Inserts a single record into the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, record: object) => Promise<[Error|null, object|null]>} A function that inserts a record into the database.
 */
export const insertOne = (conn) => async (model, record) => {
	const m = getModel(conn, model)
	const [err, result] = await tryit(async () => {
		let result = await m.create(record)
		return result.toObject();
	})()
	if (err) return [err, null]
	return [null, result]
}

/**
 * Updates a single record in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, updateData: object) => Promise<[Error|null, boolean]>} A function that updates a record in the database.
 */
export const updateOne = (conn) => async (model, query, updateObj) => {
	const m = getModel(conn, model)
	let updateData = {};
	if (updateObj.increment) {
		updateData.$inc = updateObj.increment;
	}
	if (updateObj.set) {
		updateData.$set = updateObj.set;
	}
	const q = transformFilter(query);
	const r = m.updateOne(q, updateData);
	const [err, result] = await tryit(() => {
		if (_.isEmpty(updateData)) {
			throw new Error('Update data is empty');
		}
		return r.exec()
	})()
	if (err) return [err, false]
	if (result.acknowledged && result.modifiedCount == 1) {
		return [null, true]
	}
	return [null, false]
}

/**
 * Updates a single record in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, updateData: object) => Promise<[Error|null, boolean]>} A function that updates a record in the database.
 */
export const upsert = (conn) => async (model, query, insertData) => {
	const m = getModel(conn, model)
	let updateData = {
		$setOnInsert: insertData
	};
	const q = transformFilter(query);
	const r = m.updateOne(q, updateData, { upsert: true });
	const [err, result] = await tryit(async() => {
		let result = await r.exec()
		return result?.upsertedCount > 0;
	})()
	return [err, result]
}

/**
 * Finds a single record in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, opts?: object) => Promise<[Error|null, object|null]>} A function that finds a record in the database.
 */
export const selectOne = (conn) => async (model, query, opts = {}) => {
	const m = getModel(conn, model)
	const fields = opts.fields || [];
	const q = transformFilter(query);
	const r = m.findOne(q, fields);
	_.each(['sort', 'maxTimeMS'], (prop) => {
		let val = opts[prop] || null;
		if (val) {
			r[prop](val);
		}
	});
	if (!opts.maxTimeMS) {
		r.maxTimeMS(DEFAULT_MAX_TIME_MS)
	}
	const [err, record] = await tryit(() => {
		return r.lean().exec()
	})()
	if (err) return [err, null]
	return [null, record]
}

/**
 * Finds a single record by id in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, id: string) => Promise<[Error|null, object|null]>} A function that finds a record by id in the database.
 */
export const selectViaId = (conn) => async (model, id) => {
	const m = getModel(conn, model)
	return selectOne(conn)(model, { _id: id })
}

/**
 * Finds many records in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, fields?: string[], opts?: object) => Promise<[Error|null, object[]|null]>} A function that finds many records in the database.
 */
export const selectMany = (conn) => async (model, query, opts = {}) => {
	const m = getModel(conn, model)
	const fields = opts.fields || [];

	const transformedQuery = transformFilter(query);

	const mgQuery = m.find(transformedQuery, fields);
	const limit = opts.per_page || opts.limit || 100;
	let skip = ((opts.page_no || opts.page || 1) - 1) * (limit);
	if (skip > 0) {
		mgQuery.skip(skip)
	}
	if (limit) {
		mgQuery.limit(limit);
	}
	_.each(['sort', 'maxTimeMS'], (prop) => {
		let val = opts[prop] || null;
		if (val) {
			mgQuery[prop](val);
		}
	});
	if (!opts.maxTimeMS) {
		mgQuery.maxTimeMS(DEFAULT_MAX_TIME_MS)
	}
	const [err, records] = await tryit(() => {
		return mgQuery.lean().exec()
	})()
	if (err) return [err, null]
	return [null, records || []]
}

/**
 * Updates many records in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, updateFields: object) => Promise<[Error|null, boolean|null]>} A function that updates many records in the database.
 */
export const updateMany = (conn) => async (model, query, updateFields) => {
	const m = getModel(conn, model)
	const q = transformFilter(query);
	const r = m.updateMany(q, { $set: updateFields }).maxTimeMS(DEFAULT_MAX_TIME_MS);
	const [err, res] = await tryit(() => {
		return r.exec()
	})()
	if (err) return [err, null]
	return [null, res]
}

/**
 * Deletes a single record in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object) => Promise<[Error|null, boolean]>} A function that deletes a record in the database.
 */
export const deleteOne = (conn) => async (model, query) => {
	const m = getModel(conn, model)
	const q = transformFilter(query);
	const [err] = await tryit(() => {
		return m.deleteOne(q)
	})()
	if (err) return [err, false]
	return [null, true]
}

/**
 * Deletes a multiple records in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object) => Promise<[Error|null, boolean|null, number]>} A function that deletes a record in the database.
 */
export const deleteMany = (conn) => async (model, query) => {
	const m = getModel(conn, model)
	const q = transformFilter(query);
	const [err, result] = await tryit(() => {
		return m.deleteMany(q).maxTimeMS(DEFAULT_MAX_TIME_MS)
	})()
	if (err) return [err, false, 0]
	return [null, true, result?.deletedCount || 0]
}

/**
 * Counts document based on query passed in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object) => Promise<[Error|null, boolean|null]>} A function that Counts document
 */
export const countDocuments = (conn) => async (model, query) => {
	const m = getModel(conn, model)
	let q = transformFilter(query);

	const [err, result] = await tryit(() => {
		return m.countDocuments(q).maxTimeMS(DEFAULT_MAX_TIME_MS)
	})()
	if (err) return [err, null]
	return [null, result || 0]
}

/**
 * Bulk writes to the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, ops: object[]) => Promise<[Error|null, object|null]>} A function that bulk writes to the database.
 */
export const bulkWrite = (conn) => async (model, ops, opts = {}) => {
	const m = getModel(conn, model)
	const [err, result] = await tryit(() => {
		return m.bulkWrite(ops, opts)
	})()
	if (err) return [err, null]
	return [null, result]
}

/**
 * Inserts many records into the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, docs: object[], opts?: object) => Promise<[Error|null, object|null]>} A function that inserts many records into the database.
 */
export const insertMany = (conn) => async (model, docs, opts = {}) => {
	const m = getModel(conn, model)
	const [err, result] = await tryit(async () => {
		return m.insertMany(docs, opts)
	})()
	if (err) return [err, null]
	return [null, result]
}

/**
 * Finds a single record and updates it in the database
 * @param {import('mongoose').Connection} conn
 * @returns {(model: string, query: object, updateData: object, opts?: object) => Promise<[Error|null, object|null]>} A function that finds a single record and updates it in the database.
 */
export const selectOneAndUpdate = (conn) => async (model, query, updateData, opts = {}) => {
	const m = getModel(conn, model)
	const q = transformFilter(query);
	const [err, result] = await tryit(() => {
		let updateOpts = {}
		if (updateData.increment) {
			updateOpts.$inc = updateData.increment
		}
		if (updateData.set) {
			updateOpts.$set = updateData.set
		}
		opts.new = true
		return m.findOneAndUpdate(q, updateOpts, opts).lean().exec()
	})()
	if (err) return [err, null]
	return [null, result]
}
