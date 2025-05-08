import { trim } from 'radash';
import { ParamParser } from './param-parser';

/**
 * @typedef {import('./types').HttpMethod} HttpMethod
 * @typedef {import('./types').HttpPath} HttpPath
 */

/**
 * @typedef {Object} TrieNode
 * @property {string} path - The path segment
 * @property {TrieNode[]} children - Child nodes
 * @property {Object.<string, Function>} handlers - HTTP method handlers
 * @property {ParamParser|null} parser - Parameter parser for the path
 */

/**
 * @typedef {TrieNode} Trie
 */

/**
 * Adds a new node to the trie
 * @param {Trie} trie - The trie to add to
 * @param {HttpMethod} method - The HTTP method
 * @param {HttpPath} path - The path to add
 * @param {Function} handler - The handler function
 * @returns {Trie} The updated trie
 */
export const addNode = (trie, method, path, handler) => {
  const parts = trim(path, '/').split('/');
  let node = trie;
  for (const part of parts) {
    const isWildcard = part.match(/^{[^\/]+}$/);
    const match =
      node.children.find(c => c.path === part) ??
      node.children.find(c => c.path === '*');
    if (match) {
      node = match;
    } else {
      const newNode = {
        path: isWildcard ? '*' : part,
        children: [],
        handlers: {},
        parser: null
      };
      node.children.push(newNode);
      node = newNode;
    }
  }
  node.handlers[method] = handler;
  node.parser = ParamParser(path);
  return trie;
};

/**
 * Searches for a handler in the trie
 * @param {Trie} trie - The trie to search in
 * @param {HttpMethod} method - The HTTP method to search for
 * @param {HttpPath} path - The path to search for
 * @returns {{handler: Function|null, parser: ParamParser|null}} The found handler and parser
 */
export const search = (trie, method, path) => {
  const parts = trim(path, '/').split('/');
  let node = trie;
  for (const part of parts) {
    const match =
      node.children.find(c => c.path === part) ??
      node.children.find(c => c.path === '*');
    if (!match) return { handler: null, parser: null };
    node = match;
  }
  return {
    handler: node.handlers[method] ?? node.handlers['*'] ?? null,
    parser: node.parser
  };
};
