import { BadRequestError } from '../core/error.js';
import { isArray, isFunction, tryit } from 'radash';
import zod from 'zod';

const isZodError = (e) => e && e.issues && isArray(e.issues);

/**
 * @typedef {import('../core/types.js').Props} Props
 * @typedef {import('../core/types.js').NextFunc} NextFunc
 */

/**
 * @param {NextFunc} func
 * @param {zod.ZodObject<any> | zod.ZodArray<any>} model
 * @param {Props} props
 * @returns {Promise<any>}
 */
const withHeaders = async (func, model, props) => {
  const [zerr, args] = await tryit(model.parseAsync)(props.request.headers);
  if (zerr) {
    if (!isZodError(zerr)) {
      throw new BadRequestError(
        'Header validation failed: ' + (zerr.message ?? 'Parse error'),
        {
          key: 'err.headers.parsing',
          cause: zerr
        }
      );
    }
    throw new BadRequestError(
      'Header validation failed: ' +
        zerr.issues
          .map(e => `${e.path.join('.')}: ${e.message.toLowerCase()}`)
          .join(', '),
      {
        key: 'err.headers.failed',
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
 * @param {zod.ZodObject<any> | ((z: typeof zod) => zod.ZodObject<any>)} shapeMaker
 * @returns {(func: NextFunc) => NextFunc}
 */
export const useHeaders = (shapeMaker) => (func) => {
  const model = isFunction(shapeMaker)
    ? zod.object(shapeMaker(zod))
    : shapeMaker;
  return (props) => withHeaders(func, model, props);
};
