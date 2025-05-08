import { NextFunc, NotAuthorizedError } from '../core';
import { isArray, isFunction, sift } from 'radash';

/**
 * @typedef {import('../core').Props} Props
 */

/**
 * @typedef {Object} UseRoleAuthorizationOptions
 * @property {(props: Props) => string[]|Promise<string[]>} roles - A function that returns a list of roles the current user possess
 * @property {string|string[]|((props: Props) => string|string[]|Promise<string>|Promise<string[]>)} [require] - The permission(s) that the endpoint requires. If the user does not have permissions (known by the `permissions` property) sufficent enough to cover this requirement an authorization error will be thrown
 */

/**
 * Executes a function with role-based authorization
 * @param {NextFunc} func - The function to execute
 * @param {UseRoleAuthorizationOptions} options - The authorization options
 * @param {Props} props - The request props
 * @returns {Promise<any>}
 */
export async function withRoleAuthorization(func, options, props) {
  const has = await Promise.resolve(options.roles(props));
  const raw = options.require
    ? await Promise.resolve(
        isFunction(options.require) ? options.require(props) : options.require
      )
    : null;

  const requires = sift(isArray(raw) ? raw : [raw]);
  for (const required of requires) {
    if (!has.includes(required)) {
      throw new NotAuthorizedError(
        `Missing required role (${required}) to call this function`,
        {
          key: 'exo.err.rauthz.failed'
        }
      );
    }
  }
  return await func(props);
}

/**
 * Creates a middleware that enforces role-based authorization
 * @param {UseRoleAuthorizationOptions} options - The authorization options
 * @returns {(func: NextFunc) => (props: Props) => Promise<any>}
 */
export const useRoleAuthorization = (options) => (func) => (props) =>
  withRoleAuthorization(func, options, props);
