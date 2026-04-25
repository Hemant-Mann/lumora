/**
 * @typedef {import('mongoose').Connection} MongooseConnection
 * @typedef {import('mongoose').Model} MongooseModel
 * @typedef {import('mongoose').Schema} MongooseSchema
 * @typedef {import('mongoose').Document} MongooseDocument
 */

/**
 * @typedef {Object} MongoDatabaseConfig
 * @property {string} mongoUri - MongoDB connection URI
 * @property {string} databaseName - MongoDB database name
 * @property {number} [connectTimeoutMS=10000] - Connection timeout in milliseconds
 * @property {number} [socketTimeoutMS=45000] - Socket timeout in milliseconds
 */

/**
 * @typedef {Object} MongooseClient
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, object|null]>} selectOne - Find one document
 * @property {(model: string, id: string) => Promise<[Error|null, object|null]>} selectViaId - Find one document by id
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, object[]|null]>} selectMany - Find many documents
 * @property {(model: string, query: object) => Promise<[Error|null, number|null]>} count - Count documents
 * @property {(model: string, record: object) => Promise<[Error|null, object|null]>} insertOne - Insert one document
 * @property {(model: string, query: object, insertData: object) => Promise<[Error|null, boolean]>} upsert - Upsert one document
 * @property {(model: string, query: object, updateData: object) => Promise<[Error|null, boolean]>} updateOne - Update one document
 * @property {(model: string, query: object, updateFields: object) => Promise<[Error|null, object|null]>} updateMany - Update many documents
 * @property {(model: string, query: object) => Promise<[Error|null, boolean]>} deleteOne - Delete one document
 * @property {(model: string, query: object) => Promise<[Error|null, boolean, number]>} deleteMany - Delete many documents
 * @property {(model: string, ops: object[], opts?: object) => Promise<[Error|null, object|null]>} bulkWrite - Bulk write documents
 * @property {(model: string, docs: object[], opts?: object) => Promise<[Error|null, object|null]>} insertMany - Insert many documents
 * @property {(model: string, query: object, updateData: object, opts?: object) => Promise<[Error|null, object|null]>} selectOneAndUpdate - Find one and update
 * @property {() => import('mongoose').Types.ObjectId} generateNewId - Generate a new ObjectId
 * @property {(id: string) => boolean} isValidId - Check if id is a valid ObjectId
 * @property {(err: Error) => boolean} isDuplicateError - Check if error is a duplicate key error
 * @property {() => boolean} isConnected - Check if the connection is active
 * @property {() => Promise<void>} disconnect - Close the connection
 */

export {}
