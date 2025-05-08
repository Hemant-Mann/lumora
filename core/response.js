import { isNumber } from 'radash';

/**
 * There is a 1 in 1,000,000,000 chance that someone may
 * return an object with _type equal to '@response'
 * and this will break. Nobody do that...
 * @param {any} res
 * @returns {res is import('./types.js').Response}
 */
export const isResponse = (res) => {
  return res?.type === '@response';
};

/** @type {import('./types.js').Response} */
export const defaultResponse = {
  type: '@response',
  status: 200,
  headers: {},
  body: {},
  error: null
};

/**
 * @param {any} result
 * @returns {import('./types.js').Response}
 */
export const responseFromResult = (result) => {
  if (isResponse(result)) return result;
  // If nothing was returned then return the default
  // success response
  if (!result) return defaultResponse;
  // Else, the function returned something that should be
  // returned as the json body response
  return {
    ...defaultResponse,
    body: result
  };
};

/**
 * @param {any} error
 * @returns {import('./types.js').Response}
 */
export const responseFromError = (error) => {
  if (isResponse(error)) return error;
  // Else its an error we're not equipped to handle
  // return an unknown to the user.
  return {
    ...defaultResponse,
    status: 500,
    error,
    body: {
      status: 500,
      message: 'Unknown Error'
    }
  };
};

/**
 * @param {any} error
 * @param {any} result
 * @returns {import('./types.js').Response}
 */
export const response = (error, result) => {
  return error ? responseFromError(error) : responseFromResult(result);
};

/**
 * Generate a response object
 *
 * @example
 * ```js
 * const { res } from 'lumora/core'
 *
 * const handler = async () => {
 *   return res(401, {
 *     message: 'Not Authorized'
 *   })
 * }
 *
 * compose(useNext(), handler)
 * ```
 * @overload
 * @returns {import('./types.js').Response}
 * @overload
 * @param {import('./types.js').SerializableJson} body
 * @returns {import('./types.js').Response}
 * @overload
 * @param {number} status
 * @returns {import('./types.js').Response}
 * @overload
 * @param {number} status
 * @param {import('./types.js').SerializableJson} body
 * @returns {import('./types.js').Response}
 */
export function res(statusOrBody, body) {
  if (!statusOrBody && !body) return defaultResponse;
  return {
    ...defaultResponse,
    status: isNumber(statusOrBody) ? statusOrBody : 200,
    body: !!body ? body : isNumber(statusOrBody) ? {} : statusOrBody
  };
} 