import { isArray, isString } from 'radash';
import { parse } from './permission';
import * as trie from './trie';

/**
 * @typedef {import('./types').Permission} Permission
 * @typedef {import('./types').PermissionKey} PermissionKey
 * @typedef {import('./trie').Trie} Trie
 */

/**
 * Converts various permission formats to a standardized array of Permission objects
 * @param {Permission|PermissionKey|(Permission|PermissionKey)[]} variety - The permission(s) to convert
 * @returns {Permission[]} Array of Permission objects
 */
const toPermissions = (variety) => {
  return isArray(variety)
    ? variety.map(p => (isString(p) ? parse(p) : p))
    : isString(variety)
    ? [parse(variety)]
    : [variety];
};

/**
 * Checks if a user's permissions satisfy a required permission
 * @param {Object} args - The arguments object
 * @param {Permission|PermissionKey} args.do - The required permission
 * @param {Trie|Permission|PermissionKey|(Permission|PermissionKey)[]} args.with - The user's permissions
 * @returns {boolean} True if the user has the required permission
 */
export const cani = (args) => {
  const needs = isString(args.do) ? parse(args.do) : args.do;
  const ptree = trie.isTrie(args.with)
    ? args.with
    : trie.build(toPermissions(args.with));
  
  const matches = trie.search(ptree, needs);
  if (matches.length === 0) return false;
  
  const related = matches.filter(
    p => p.scope === needs.scope || p.scope === '*'
  );
  if (related.length === 0) return false;
  
  const denied = related.find(r => r.acl === 'deny');
  if (denied) return false;
  
  return true;
};

/**
 * Creates a user permission checker
 * @param {Permission|PermissionKey|(Permission|PermissionKey)[]} permissions - The user's permissions
 * @returns {Object} An object with a do method to check permissions
 */
export const user = (permissions) => {
  const ptree = trie.build(toPermissions(permissions));
  return {
    do: (required) => cani({
      do: required,
      with: ptree
    })
  };
};
