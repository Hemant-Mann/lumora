import { BadRequestError } from '../core';
import { isArray, isFunction, tryit } from 'radash';
import { z as zod } from 'zod';

const isZodError = (e) => e && e.issues && isArray(e.issues);

/**
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('../core').Props} Props
 * @typedef {import('zod').AnyZodObject} AnyZodObject
 * @typedef {import('zod').ZodArray} ZodArray
 * @typedef {import('zod').ZodObject} ZodObject
 * @typedef {import('zod').ZodRawShape} ZodRawShape
 */

/**
 * @param {NextFunc} func
 * @param {AnyZodObject|ZodArray} model
 * @param {Props} props
 * @returns {Promise<any>}
 */
export const withPathParams = async (func, model, props) => {
  const [zerr, args] = await tryit(model.parseAsync)(props.request.params);
  if (zerr) {
    if (!isZodError(zerr)) {
      throw new BadRequestError(
        'Path parameter validation failed: ' + (zerr.message ?? 'Parse error'),
        {
          key: 'err.path-params.parsing',
          cause: zerr
        }
      );
    }
    throw new BadRequestError(
      'Path parameter validation failed: ' +
        zerr.issues
          .map(e => `${e.path.join('.')}: ${e.message.toLowerCase()}`)
          .join(', '),
      {
        key: 'err.path-params.failed',
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
 * @param {ZodObject|((z: typeof zod) => ZodRawShape)} shapeMaker
 * @returns {(func: NextFunc) => NextFunc}
 */
export const usePathParams = (shapeMaker) => (func) => {
  const model = isFunction(shapeMaker)
    ? zod.object(shapeMaker(zod))
    : shapeMaker;
  return (props) => withPathParams(func, model, props);
};
