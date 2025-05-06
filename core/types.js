/**
 * @typedef {Object} Request
 * @property {Record<string, string | string[]>} headers
 * @property {string} url
 * @property {string} path
 * @property {Record<string, any> | string | null} body
 * @property {string} method
 * @property {Record<string, string>} query
 * @property {Record<string, string>} params
 * @property {string} ip
 * @property {number} startedAt - Milliseconds timestamp when the request started
 * @property {string} httpVersion
 * @property {string} protocol
 */

/**
 * @typedef {Object} Response
 * @property {'@response'} type
 * @property {Record<string, string | string[]>} headers
 * @property {number} status
 * @property {any} body
 * @property {Error | null} error
 */

/**
 * @template TArgs
 * @template TServices
 * @template TAuth
 * @template TRequest
 * @template TFramework
 * @typedef {Object} Props
 * @property {TAuth} auth
 * @property {TArgs} args
 * @property {TServices} services
 * @property {TRequest} request
 * @property {Response} response
 * @property {TFramework} framework
 */

/**
 * @template TProps
 * @template TResult
 * @typedef {(props: TProps) => Promise<TResult>} NextFunc
 */

/**
 * @typedef {string | number | boolean | null | Date | SerializableJson[] | { [key: string]: SerializableJson }} SerializableJson
 */

/**
 * @template TFunc
 * @typedef {TFunc['_props']} InferProps
 */

export {}; 