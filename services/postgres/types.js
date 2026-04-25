/**
 * @typedef {import('mongoose').Connection} MongooseConnection
 * @typedef {import('mongoose').Model} MongooseModel
 * @typedef {import('mongoose').Schema} MongooseSchema
 * @typedef {import('mongoose').Document} MongooseDocument
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} postgresUri - Postgres connection URI
 */

/**
 * @typedef {Object} MongoClient
 * @property {MongooseConnection} connection - Mongoose connection instance
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, object|null]>} selectOne - Function to find one document
 * @property {Function} selectViaId - Function to find one document by id
 * @property {Function} selectMany - Function to find many documents
 * @property {Function} insertOne - Function to insert one document
 * @property {Function} updateOne - Function to update one document
 * @property {Function} updateMany - Function to update many documents
 * @property {(model: string, query: object) => Promise<[Error|null, boolean]>} deleteOne - Function to delete one document
 * @property {Function} deleteMany - Function to delete many documents
 * @property {Function} count - Function to count records in collection
 * @property {Function} isConnected - Function to check if the database is connected
 * @property {Function} count - Function to get count of documents
 * @property {Function} bulkWrite - Function to bulk write documents
 * @property {Function} insertMany - Function to insert many documents
 * @property {Function} findOneAndUpdate - Function to find one and update document
 * @property {Function} generateNewId - Function to generate a new ObjectId
 */

/**
 * @typedef {Object} ModelOptions
 * @property {string} name - Name of the model
 * @property {MongooseSchema} schema - Mongoose schema for the model
 * @property {Object} [options] - Additional model options
 * @property {string} [options.collection] - Collection name
 * @property {boolean} [options.strict=true] - Whether to enforce schema
 * @property {boolean} [options.timestamps=false] - Whether to add timestamps
 */

/**
 * @typedef {Object} QueryOptions
 * @property {Object} [filter] - Query filter
 * @property {Object} [projection] - Fields to include/exclude
 * @property {Object} [options] - Query options
 * @property {number} [options.limit] - Maximum number of documents
 * @property {number} [options.skip] - Number of documents to skip
 * @property {Object} [options.sort] - Sort criteria
 * @property {boolean} [options.lean=false] - Whether to return plain objects
 */

/**
 * @typedef {Object} UpdateOptions
 * @property {Object} filter - Query filter
 * @property {Object} update - Update operations
 * @property {Object} [options] - Update options
 * @property {boolean} [options.upsert=false] - Whether to create if not exists
 * @property {boolean} [options.multi=false] - Whether to update multiple documents
 * @property {boolean} [options.new=false] - Whether to return updated document
 */

/**
 * @typedef {Object} DeleteOptions
 * @property {Object} filter - Query filter
 * @property {Object} [options] - Delete options
 * @property {boolean} [options.multi=false] - Whether to delete multiple documents
 */

/**
 * @typedef {Object} AggregateOptions
 * @property {Array} pipeline - Aggregation pipeline stages
 * @property {Object} [options] - Aggregation options
 * @property {boolean} [options.allowDiskUse=false] - Whether to allow disk use
 * @property {number} [options.maxTimeMS] - Maximum execution time
 */

/**
 * @typedef {Object} TransactionOptions
 * @property {Function} callback - Transaction callback
 * @property {Object} [options] - Transaction options
 * @property {number} [options.maxCommitRetries=3] - Maximum commit retries
 * @property {number} [options.retryDelay=1000] - Delay between retries in ms
 */

/**
 * @typedef {Object} IndexOptions
 * @property {Object} fields - Index fields
 * @property {Object} [options] - Index options
 * @property {boolean} [options.unique=false] - Whether index is unique
 * @property {boolean} [options.sparse=false] - Whether index is sparse
 * @property {number} [options.expireAfterSeconds] - TTL in seconds
 */

/**
 * @typedef {Object} ValidationOptions
 * @property {boolean} [strict=true] - Whether to enforce schema
 * @property {boolean} [validateBeforeSave=true] - Whether to validate before save
 * @property {boolean} [runValidators=true] - Whether to run validators
 */

export {};
