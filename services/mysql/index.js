import createMysqlClient from './client.js'
import _ from 'lodash'
import knex from 'knex'

/** @type {Map<string, import('knex').Knex>} */
let defConnMap = new Map()

/**
 * Get or create a MySQL connection (knex instance)
 * @param {string} name - Connection name
 * @param {Object} opts - Connection options
 * @param {string} opts.mysqlUri - MySQL connection URI
 * @returns {import('knex').Knex}
 */
export const getConn = (name, opts = {}) => {
  if (_.isEmpty(name)) {
    throw new Error('MySQL connection name cannot be empty')
  }

  let conn = defConnMap.get(name)
  if (!conn) {
    conn = knex({
      client: 'mysql2',
      connection: opts.mysqlUri,
      pool: {
        min: 0,
        max: 20,
      },
      acquireConnectionTimeout: 10000,
    })
    defConnMap.set(name, conn)
  }
  return conn
}

/**
 * Create a MySQL client with the given connection
 * @param {string} name - Name of the connection
 * @param {import('./types').MysqlDatabaseConfig} opts - Database configuration
 * @returns {import('./types').MysqlClient}
 */
export const makeMysql = (name, opts = {}) => {
  const conn = getConn(name, opts)
  return createMysqlClient(conn)
}

/**
 * Disconnect from MySQL
 * @param {string} name - Name of the connection
 */
export const disconnectMysql = async (name) => {
  const conn = defConnMap.get(name)

  if (conn) {
    await conn.destroy()
    defConnMap.delete(name)
  }
}
