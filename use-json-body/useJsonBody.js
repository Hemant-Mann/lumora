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
 * @param {string | undefined} name
 * @param {zod.ZodObject<any> | zod.ZodArray<any>} model
 * @param {Props} props
 * @returns {Promise<any>}
 */
const withJsonBody = async (func, name, model, props) => {
  const [zerr, args] = await tryit(model.parseAsync)(props.request.body);
  if (zerr) {
    if (!isZodError(zerr)) {
      throw new BadRequestError(
        'Json body validation failed: ' + (zerr.message ?? 'Parse error'),
        {
          key: 'err.json-body.parsing',
          cause: zerr
        }
      );
    }
    throw new BadRequestError(
      'Json body validation failed: ' +
        zerr.issues
          .map(e => `${e.path.join('.')}: ${e.message.toLowerCase()}`)
          .join(', '),
      {
        key: 'err.json-body.failed',
        cause: zerr
      }
    );
  }
  return await func({
    ...props,
    args: {
      ...props.args,
      ...(name ? { [name]: args } : args)
    }
  });
};

/**
 * @param {zod.ZodObject<any> | ((z: typeof zod) => zod.ZodObject<any>)} shapeMaker
 * @returns {(func: NextFunc) => NextFunc}
 */
export const useJsonBody = (shapeMaker) => (func) => {
  const model = isFunction(shapeMaker)
    ? zod.object(shapeMaker(zod))
    : shapeMaker;
  return (props) => withJsonBody(func, undefined, model, props);
};

/**
 * @param {string} name
 * @param {zod.ZodArray<any> | ((z: typeof zod) => zod.ZodArray<any>)} shapeMaker
 * @returns {(func: NextFunc) => NextFunc}
 */
export const useJsonArrayBody = (name, shapeMaker) => (func) => {
  const model = isFunction(shapeMaker)
    ? zod.array(shapeMaker(zod))
    : shapeMaker;
  return (props) => withJsonBody(func, name, model, props);
};
