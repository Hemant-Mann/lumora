/**
 * @typedef {Object} MysqlDatabaseConfig
 * @property {string} mysqlUri
 */

/**
 * @typedef {Object} MysqlClient
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, object|null]>} selectOne
 * @property {(model: string, id: string) => Promise<[Error|null, object|null]>} selectViaId
 * @property {(model: string, query: object, opts?: { fields?: (string|{raw?:string,key?:string,alias?:string})[], groupBy?: string|string[]|{raw?:string,key?:string}, sort?: object, limit?: number, page?: number, maxTimeMS?: number }) => Promise<[Error|null, object[]|null]>} selectMany
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, number|null]>} count
 * @property {(model: string, record: object) => Promise<[Error|null, object|null]>} insertOne
 * @property {(model: string, docs: object[], opts?: object) => Promise<[Error|null, number|null]>} insertMany
 * @property {(model: string, query: object, updateData: object) => Promise<[Error|null, boolean]>} updateOne
 * @property {(model: string, query: object, updateFields: object, opts?: object) => Promise<[Error|null, object|null]>} updateMany
 * @property {(model: string, query: object, insertData: object) => Promise<[Error|null, boolean]>} upsert
 * @property {(model: string, query: object) => Promise<[Error|null, boolean]>} deleteOne
 * @property {(model: string, query: object, opts?: object) => Promise<[Error|null, boolean]>} deleteMany
 * @property {(model: string, query: object, updateData: object, opts?: object) => Promise<[Error|null, object|null]>} selectOneAndUpdate
 * @property {(model: string, ops: object[], opts?: object) => Promise<[Error|null, object|null]>} bulkWrite
 * @property {() => string} generateNewId
 * @property {(id: string) => boolean} isValidId
 * @property {(err: Error) => boolean} isDuplicateError
 * @property {() => Promise<boolean>} isConnected
 * @property {() => Promise<void>} disconnect
 * @property {(fn: Function) => Promise<[Error|null, any|null]>} runTransaction
 */

export {}
