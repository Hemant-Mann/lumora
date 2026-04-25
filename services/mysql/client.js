import {
  selectOne as selectOneMysql,
  selectMany as selectManyMysql,
  selectViaId as selectViaIdMysql,
  updateOne as updateOneMysql,
  countDocuments as countMysql,
  insertOne as insertOneMysql,
  deleteOne as deleteOneMysql,
  updateMany as updateManyMysql,
  bulkWrite as bulkWriteMysql,
  insertMany as insertManyMysql,
  selectOneAndUpdate as selectOneAndUpdateMysql,
  deleteMany as deleteManyMysql,
  upsert as upsertMysql,
} from './methods.js'
import Security from '../security.js'
import { tryit } from 'radash'

/**
 * Create a MySQL client
 * @param {import('knex').Knex} conn - Knex connection instance (client: 'mysql2')
 * @returns {import('./types').MysqlClient}
 */
const createMysqlClient = (conn) => {
  return {
    selectOne: selectOneMysql(conn),
    selectViaId: selectViaIdMysql(conn),
    selectMany: selectManyMysql(conn),
    count: countMysql(conn),
    isConnected: async () => {
      const [err, result] = await tryit(async () => {
        await conn.raw('SELECT 1')
        return true
      })()
      return err ? false : result
    },
    insertOne: insertOneMysql(conn),
    upsert: upsertMysql(conn),
    updateOne: updateOneMysql(conn),
    updateMany: updateManyMysql(conn),
    deleteOne: deleteOneMysql(conn),
    deleteMany: deleteManyMysql(conn),
    bulkWrite: bulkWriteMysql(conn),
    insertMany: insertManyMysql(conn),
    generateNewId: () => Security.id(),
    isValidId: (id) => typeof id === 'string' && id.length === 20,
    isDuplicateError: (err) => err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062),
    disconnect: async () => await conn.destroy(),
    selectOneAndUpdate: selectOneAndUpdateMysql(conn),
    runTransaction: async (fn) => {
      const [err, result] = await tryit(async () => {
        return await conn.transaction(async (trx) => {
          const trxClient = {
            selectOne: selectOneMysql(trx),
            selectMany: selectManyMysql(trx),
            insertOne: insertOneMysql(trx),
            upsert: upsertMysql(trx),
            updateOne: updateOneMysql(trx),
            updateMany: updateManyMysql(trx),
            deleteOne: deleteOneMysql(trx),
            deleteMany: deleteManyMysql(trx),
            insertMany: insertManyMysql(trx),
          }
          return await fn(trxClient)
        })
      })()
      return [err, result]
    },
  }
}

export default createMysqlClient
