import { NotAuthorizedError } from '../core/index.js';
import { isArray, isFunction, isString, sift } from 'radash';
import { cani } from './cani.js';
import * as perm from './permission.js';

/**
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('../core').Props} Props
 * @typedef {import('./types').Permission} Permission
 * @typedef {import('./types').PermissionKey} PermissionKey
 */

/**
 * @typedef {Object} UsePermissionAuthorizationOptions
 * @property {(props: Props) => Permission[]|PermissionKey[]} permissions - A function that returns a list of permissions the current user possess
 * @property {PermissionKey|PermissionKey[]|Permission|Permission[]|((props: Props) => Permission|Permission[]|PermissionKey|PermissionKey[]|Promise<Permission>|Promise<Permission[]>|Promise<PermissionKey>|Promise<PermissionKey[]>)} [require] - The permission(s) that the endpoint requires
 */

/**
 * Middleware function to check authorization permissions
 * @param {NextFunc} func - The next function in the middleware chain
 * @param {UsePermissionAuthorizationOptions} options - The authorization options
 * @param {Props} props - The request props
 * @returns {Promise<any>}
 */
export async function withPermissionAuthorization(func, options, props) {
  const has = options.permissions(props);
  const user = cani.user(has);
  const raw = options.require
    ? await Promise.resolve(
        isFunction(options.require) ? options.require(props) : options.require
      )
    : null;
  
  const requires = sift(isArray(raw) ? raw : [raw]);
  for (const required of requires) {
    if (!user.do(required)) {
      const key = isString(required)
        ? required
        : required.name ?? perm.stringify(required);
      throw new NotAuthorizedError(
        `Missing required permission (${key}) to call this function`,
        {
          key: 'exo.err.pauthz.failed'
        }
      );
    }
  }
  return await func({
    ...props,
    auth: {
      ...props.auth,
      cani: user
    }
  });
}

/**
 * Creates a middleware that checks authorization permissions
 * @param {UsePermissionAuthorizationOptions} options - The authorization options
 * @returns {(func: NextFunc) => NextFunc}
 */
export const usePermissionAuthorization = (options) => (func) => (props) =>
  withPermissionAuthorization(func, options, props);
