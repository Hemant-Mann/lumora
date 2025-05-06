import { isFunction, objectify, parallel } from 'radash';

/**
 * @typedef {import('../core/types.js').Props} Props
 * @typedef {import('../core/types.js').NextFunc} NextFunc
 */

/**
 * @template TServices
 * @typedef {{
 *   [Key in keyof TServices]:
 *     | TServices[Key]
 *     | Promise<TServices[Key]>
 *     | ((props: Props) => Promise<TServices[Key]>)
 *     | ((props: Props) => TServices[Key])
 * }} ServiceMap
 */

/**
 * @template TServiceMap
 * @typedef {{
 *   [Key in keyof TServiceMap]: TServiceMap[Key] extends Promise<infer R>
 *     ? R
 *     : TServiceMap[Key] extends (props: Props) => Promise<infer R>
 *     ? R
 *     : TServiceMap[Key] extends (props: Props) => infer R
 *     ? R
 *     : TServiceMap[Key]
 * }} ResolveServiceMap
 */

/**
 * @param {NextFunc} func
 * @param {Record<string, any>} serviceFunctionsByKey
 * @param {Props} props
 * @returns {Promise<any>}
 */
async function withServices(func, serviceFunctionsByKey, props) {
  const serviceList = await parallel(
    10,
    Object.keys(serviceFunctionsByKey),
    async (key) => {
      const serviceOrFunction = serviceFunctionsByKey[key];
      return {
        key,
        value: await Promise.resolve(
          isFunction(serviceOrFunction)
            ? serviceOrFunction(props)
            : serviceOrFunction
        )
      };
    }
  );

  const services = objectify(
    serviceList,
    (s) => s.key,
    (s) => s.value
  );

  return await func({
    ...props,
    services: {
      ...props.services,
      ...services
    }
  });
}

/**
 * @template TServiceMap
 * @param {ServiceMap<TServiceMap>} serviceFunctionsByKey
 * @returns {(func: NextFunc) => NextFunc}
 */
export const useServices = (serviceFunctionsByKey) => (func) => (props) =>
  withServices(func, serviceFunctionsByKey, props);
