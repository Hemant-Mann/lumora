import { NextFunc } from '../core/index.js';
import { isString } from 'radash';
import { addNode, search } from './trie.js';

/**
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('./trie').Trie} Trie
 * @typedef {import('./types').HttpMethod} HttpMethod
 * @typedef {import('./types').HttpPath} HttpPath
 */

/**
 * @typedef {Object} Router
 * @property {function(HttpMethod|HttpMethod[], HttpPath, NextFunc): Router} on - Register a handler for a method and path
 * @property {function(HttpPath, NextFunc): Router} get - Register a GET handler
 * @property {function(HttpPath, NextFunc): Router} put - Register a PUT handler
 * @property {function(HttpPath, NextFunc): Router} post - Register a POST handler
 * @property {function(HttpPath, NextFunc): Router} patch - Register a PATCH handler
 * @property {function(HttpPath, NextFunc): Router} delete - Register a DELETE handler
 * @property {function(HttpPath, NextFunc): Router} options - Register an OPTIONS handler
 * @property {function(HttpPath, NextFunc): Router} head - Register a HEAD handler
 * @property {function({method: HttpMethod, path: HttpPath}): {handler: NextFunc|null, params: Object}} lookup - Look up a handler for a request
 */

/**
 * Creates a new router instance
 * @param {Trie} [current] - The current trie node
 * @returns {Router} A new router instance
 */
export const router = (current) => {
  const on = (method, path, handler) => {
    const methods = isString(method) ? [method] : method;
    const newTrie = methods.reduce(
      (acc, m) => addNode(acc, m, path, handler),
      {
        children: [],
        parser: null
      }
    );
    return router(newTrie);
  };

  return {
    on,
    get: (path, handler) => on('GET', path, handler),
    put: (path, handler) => on('PUT', path, handler),
    post: (path, handler) => on('POST', path, handler),
    patch: (path, handler) => on('PATCH', path, handler),
    delete: (path, handler) => on('DELETE', path, handler),
    options: (path, handler) => on('OPTIONS', path, handler),
    head: (path, handler) => on('HEAD', path, handler),
    lookup: (req) => {
      if (!current) return { handler: null, params: {} };
      const result = search(current, req.method, req.path);
      return {
        handler: result.handler,
        params: result.parser?.parse(req.path) ?? {}
      };
    }
  };
};
