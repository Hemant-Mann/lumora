import { selectOne as selectOneMongo, selectMany as selectManyMongo, selectViaId as selectViaIdMongo, updateOne as updateOneMongo, countDocuments as countMongo, insertOne as insertOneMongo, deleteOne as deleteOneMongo, updateMany as updateManyMongo, bulkWrite as bulkWriteMongo, insertMany as insertManyMongo, selectOneAndUpdate as selectOneAndUpdateMongo, deleteMany as deleteManyMongo, upsert as upsertMongo } from './methods.js'
import { Types, isObjectIdOrHexString } from 'mongoose'

/**
 * Create a MongoDB client
 * @param {import('mongoose').Connection} conn - MongoDB connection
 * @returns {import('./types').MongooseClient}
 */
const createMongoClient = (conn) => {
	return {
		selectOne: selectOneMongo(conn),
		selectViaId: selectViaIdMongo(conn),
		selectMany: selectManyMongo(conn),
		count: countMongo(conn),
		isConnected: () => conn.readyState === 1,
		insertOne: insertOneMongo(conn),
		upsert: upsertMongo(conn),
		updateOne: updateOneMongo(conn),
		updateMany: updateManyMongo(conn),
		deleteOne: deleteOneMongo(conn),
		deleteMany: deleteManyMongo(conn),
		bulkWrite: bulkWriteMongo(conn),
		insertMany: insertManyMongo(conn),
		generateNewId: () => new Types.ObjectId(),
		isValidId: (id) => isObjectIdOrHexString(id),
		isDuplicateError: (err) => err && err.code === 11000,
		disconnect: async () => await conn.close(),
		selectOneAndUpdate: selectOneAndUpdateMongo(conn)
	}
}

export default createMongoClient
