import { isArray, isObject, sift, trim } from 'radash';

/**
 * @typedef {import('./types').Permission} Permission
 */

/**
 * @typedef {Object} TrieNode
 * @property {Record<string, TrieNode>} children
 * @property {Permission[]} value
 */

/**
 * @typedef {TrieNode} Trie
 */

/**
 * Checks if a value is a Trie structure
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a Trie
 */
export const isTrie = (value) => {
  if (!value) return value;
  return isArray(value.value) && isObject(value.children);
};

/**
 * Creates an empty Trie node
 * @returns {Trie} An empty Trie node
 */
const empty = {
  children: {},
  value: []
};

/**
 * Builds a Trie from a list of permissions
 * @param {Permission[]} permissions - The permissions to build the Trie from
 * @returns {Trie} The built Trie
 */
export const build = (permissions) => {
  return permissions.reduce((acc, p) => {
    return addNode(acc, p);
  }, empty);
};

/**
 * Adds a permission to a Trie
 * @param {Trie} trie - The Trie to add to
 * @param {Permission} permission - The permission to add
 * @returns {Trie} The updated Trie
 */
export const addNode = (trie, permission) => {
  const parts = trim(permission.uri, '/').split('/');
  let node = trie;
  
  for (const part of parts) {
    const match = node.children[part];
    if (match) {
      node = match;
    } else {
      const newNode = {
        children: {},
        value: []
      };
      node.children[part] = newNode;
      node = newNode;
    }
  }
  node.value.push(permission);
  return trie;
};

/**
 * Searches a Trie for matching permissions
 * @param {Trie} trie - The Trie to search
 * @param {Permission} permission - The permission to search for
 * @returns {Permission[]} The matching permissions
 */
export const search = (trie, permission) => {
  return _search(trie, trim(permission.uri, '/').split('/'));
};

/**
 * Internal recursive search function
 * @param {Trie} node - The current Trie node
 * @param {string[]} parts - The remaining path parts to search
 * @returns {Permission[]} The matching permissions
 */
const _search = (node, parts) => {
  if (parts.length === 0) return [];
  
  const [thisPart, ...remainingParts] = parts;
  const matches = sift([
    node.children[thisPart],
    thisPart === '*' ? node.children['*'] : null
  ]);
  
  if (parts.length === 1) return matches.flatMap(m => m.value);
  return matches.flatMap(m => _search(m, remainingParts));
};
