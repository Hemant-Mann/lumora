import { selectOne as selectOnePostgres, selectMany as selectManyPostgres, selectViaId as selectViaIdPostgres, updateOne as updateOnePostgres, countDocuments as countPostgres, insertOne as insertOnePostgres, deleteOne as deleteOnePostgres, updateMany as updateManyPostgres, bulkWrite as bulkWritePostgres, insertMany as insertManyPostgres, selectOneAndUpdate as selectOneAndUpdatePostgres, deleteMany as deleteManyPostgres, upsert as upsertPostgres } from './methods.js'
import Security from '../security.js'
import { tryit } from 'radash'
import { hexToBuffer, bufferToHex, toByteaFields, fromByteaFields } from './bytea.js';

/**
 * Create a PostgresDB client
 * @param {import('knex').Knex} conn - Knex connection instance
 * @returns {import('./types').PostgresClient}
 */
const createPostgresClient = (conn) => {
	return {
		selectOne: selectOnePostgres(conn),
		selectViaId: selectViaIdPostgres(conn),
		selectMany: selectManyPostgres(conn),
		count: countPostgres(conn),
		isConnected: async () => {
			const [err, result] = await tryit(async () => {
				await conn.raw('SELECT 1');
				return true;
			})()
			return err ? false : result;
		},
		insertOne: insertOnePostgres(conn),
		upsert: upsertPostgres(conn),
		updateOne: updateOnePostgres(conn),
		updateMany: updateManyPostgres(conn),
		deleteOne: deleteOnePostgres(conn),
		deleteMany: deleteManyPostgres(conn),
		bulkWrite: bulkWritePostgres(conn),
		insertMany: insertManyPostgres(conn),
		generateNewId: () => Security.id(),
		isValidId: (id) => typeof id === 'string' && id.length === 20,
		isDuplicateError: (err) => err && err.code === "23505",
		disconnect: async () => await conn.destroy(),
		selectOneAndUpdate: selectOneAndUpdatePostgres(conn),
		runTransaction: async (fn) => {
			const [err, result] = await tryit(async () => {
				return await conn.transaction(async (trx) => {
					const trxClient = {
						selectOne: selectOnePostgres(trx),
						selectMany: selectManyPostgres(trx),
						insertOne: insertOnePostgres(trx),
						upsert: upsertPostgres(trx),
						updateOne: updateOnePostgres(trx),
						updateMany: updateManyPostgres(trx),
						deleteOne: deleteOnePostgres(trx),
						deleteMany: deleteManyPostgres(trx),
						insertMany: insertManyPostgres(trx),
						byteaUtils: {
							hexToBuffer,
							bufferToHex,
							toByteaFields,
							fromByteaFields,
						}
					};
					return await fn(trxClient);
				});
			})();
			return [err, result];
		},
		byteaUtils: {
			hexToBuffer,
			bufferToHex,
			toByteaFields,
			fromByteaFields,
		}
	}
}

export default createPostgresClient
