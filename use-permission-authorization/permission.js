/**
 * @typedef {import('./types').Permission} Permission
 * @typedef {import('./types').PermissionKey} PermissionKey
 */

/**
 * Parses a permission string into its components
 * @param {string} str - The permission string to parse
 * @returns {Permission} The parsed permission object
 */
export function parse(str) {
  const [acl, scope, uri] = str.split(':');
  return {
    acl,
    scope,
    uri,
    name: str
  };
}

/**
 * Converts a permission object to a string
 * @param {Permission} p - The permission object to stringify
 * @returns {PermissionKey} The stringified permission
 */
export function stringify(p) {
  return p.name ?? `${p.acl}:${p.scope}:${p.uri}`;
}
