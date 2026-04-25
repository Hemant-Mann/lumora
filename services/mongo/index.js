import { createConnection } from 'mongoose'
import _ from 'lodash'
import createClient from './client.js'

/** @type {Map<string, import('mongoose').Connection>} */
let defConnMap = new Map()

/**
 * Get or create a MongoDB connection
 * @param {string} name - Connection name
 * @param {import('./types').MongoDatabaseConfig} [opts={}] - Connection options
 * @param {string} opts.mongoUri - MongoDB connection URI
 * @param {string} opts.databaseName - Database name
 * @returns {import('mongoose').Connection}
 */
export const getConn = (name, opts = {}) => {
  if (_.isEmpty(name)) {
    throw new Error('MongoDB connection name cannot be empty')
  }

  const { mongoUri, databaseName } = opts
  if (!mongoUri) {
    throw new Error('mongoUri is required')
  }

  let conn = defConnMap.get(name)
  if (!conn) {
    conn = createConnection(mongoUri, { dbName: databaseName })
    defConnMap.set(name, conn)
  }
  return conn
}

/**
 * Register a model with the database connection
 * @param {string} name - Connection name
 * @param {string} model - Name of the model
 * @param {import('mongoose').Schema} schema - Mongoose schema
 * @returns {import('mongoose').Model}
 */
export const registerModel = (name, model, schema) => {
  const conn = getConn(name)
  return conn.model(model, schema)
}

/**
 * Create a MongoDB client with the given connection
 * @param {string} name - Name of the connection
 * @param {import('./types').MongoDatabaseConfig} [opts={}] - Database configuration
 * @returns {import('./types').MongoClient}
 */
const makeMongo = (name, opts = {}) => {
  const conn = getConn(name, opts)
  return createClient(conn)
}

/**
 * Disconnect from MongoDB
 * @param {string} name - Name of the connection
 */
export const disconnectMongo = async (name) => {
  const conn = defConnMap.get(name)
  if (conn) {
    await conn.close()
    defConnMap.delete(name)
  }
}

export default makeMongo
