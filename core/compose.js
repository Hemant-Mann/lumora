/**
 * @template T
 * @typedef {{
 *   [P in keyof T as P extends 'prototype' ? never : P]: T[P]
 * }} AttributesOnly
 */

/**
 * @template T
 * @typedef {T extends any ? (k: T) => void : never extends (k: infer I) => void ? I : never} UnionToIntersection
 */

/**
 * @template {import('./types.js').Props[]} T
 * @typedef {import('./types.js').Props<
 *   UnionToIntersection<T[number]['args']> extends infer A ? A extends {} ? A : {} : {},
 *   UnionToIntersection<T[number]['services']> extends infer B ? B extends {} ? B : {} : {},
 *   UnionToIntersection<T[number]['auth']> extends infer C ? C extends {} ? C : {} : {},
 *   UnionToIntersection<T[number]['request']> extends infer D ? D extends import('./types.js').Request ? D : import('./types.js').Request : import('./types.js').Request,
 *   UnionToIntersection<T[number]['framework']> extends infer E ? E extends {} ? E : {} : {}
 * >} MergeProps
 */

/**
 * @param {Function[]} funcs
 * @returns {Function}
 */
export function compose(...funcs) {
  const result = funcs.reverse().reduce((acc, fn) => {
    const next = fn(acc)
    Object.keys(acc).forEach(key => {
      next[key] = acc[key]
    })
    return next
  })
  result.endpoint = funcs[0]
  return result
} 