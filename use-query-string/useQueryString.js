import { BadRequestError } from '../core/index.js';
import { isArray, isFunction, tryit } from 'radash';
import { z as zod } from 'zod';

const isZodError = (e) => e && e.issues && isArray(e.issues);

/**
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('../core').Props} Props
 * @typedef {import('zod').AnyZodObject} AnyZodObject
 * @typedef {import('zod').ZodObject} ZodObject
 * @typedef {import('zod').ZodRawShape} ZodRawShape
 */

/**
 * Middleware function to validate query string parameters
 * @param {NextFunc} func - The next function in the middleware chain
 * @param {AnyZodObject} model - The Zod schema to validate against
 * @param {Props} props - The request props
 * @returns {Promise<any>}
 */
export const withQueryString = async (func, model, props) => {
  const [zerr, args] = await tryit(model.parseAsync)(props.request.query);
  if (zerr) {
    if (!isZodError(zerr)) {
      throw new BadRequestError(
        'Query string validation failed: ' + (zerr.message ?? 'Parse error'),
        {
          key: 'err.query-string.parsing',
          cause: zerr
        }
      );
    }
    throw new BadRequestError(
      'Query string validation failed: ' +
        zerr.issues
          .map(e => `${e.path.join('.')}: ${e.message.toLowerCase()}`)
          .join(', '),
      {
        key: 'err.query-string.failed',
        cause: zerr
      }
    );
  }
  return await func({
    ...props,
    args: {
      ...props.args,
      ...args
    }
  });
};

/**
 * Creates a middleware that validates query string parameters
 * @param {ZodObject|((z: typeof zod) => ZodRawShape)} shapeMaker - The Zod schema or schema maker function
 * @returns {(func: NextFunc) => NextFunc}
 */
export const useQueryString = (shapeMaker) => (func) => {
  const model = isFunction(shapeMaker)
    ? zod.object(shapeMaker(zod))
    : shapeMaker;
  return (props) => withQueryString(func, model, props);
};
