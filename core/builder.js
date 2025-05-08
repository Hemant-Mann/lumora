import { omit, pick } from 'radash';

/**
 * @template KInitArgs
 * @template KCurrentArgs
 * @template KCurrentServices
 * @template KCurrentAuth
 * @template KCurrentRequest
 * @template KCurrentFramework
 */
export const chain = (funcs = []) => ({
  /**
   * @param {(func: (...args: any[]) => Promise<any>) => (...args: any[]) => Promise<any>} init
   * @returns {Pick<LumoBuilder, 'init' | 'root'>}
   */
  init: (init) => {
    return chain([...funcs, init]);
  },

  /**
   * @template TInitArgs
   * @template TCurrentArgs
   * @template TCurrentServices
   * @template TCurrentAuth
   * @template TCurrentRequest
   * @template TCurrentFramework
   * @param {(func: (props: import('./types.js').Props<TCurrentArgs, TCurrentServices, TCurrentAuth, TCurrentRequest, TCurrentFramework>) => Promise<any>) => (...args: TInitArgs) => Promise<any>} root
   * @returns {Pick<LumoBuilder<TInitArgs, TCurrentArgs, TCurrentServices, TCurrentAuth, TCurrentRequest, TCurrentFramework>, 'hook' | 'endpoint'>}
   */
  root: (root) => {
    return chain([...funcs, root]);
  },

  /**
   * @template TNextArgs
   * @template TNextServices
   * @template TNextAuth
   * @template TNextRequest
   * @template TNextFramework
   * @template TRequiredServices
   * @template TRequiredAuth
   * @template TRequiredArgs
   * @template TRequiredRequest
   * @template TRequiredFramework
   * @param {(func: (props: import('./types.js').Props<TNextArgs, TNextServices, TNextAuth, TNextRequest, TNextFramework>) => Promise<any>) => (props: import('./types.js').Props<TRequiredArgs, TRequiredServices, TRequiredAuth, TRequiredRequest, TRequiredFramework>) => Promise<any>} hook
   * @returns {Pick<LumoBuilder<KInitArgs, TNextArgs & KCurrentArgs, TNextServices & KCurrentServices, TNextAuth & KCurrentAuth, TNextRequest & KCurrentRequest, TNextFramework & KCurrentFramework>, 'hook' | 'endpoint'>}
   */
  hook: (hook) => {
    return omit(
      chain([...funcs, hook]),
      ['init', 'root']
    );
  },

  /**
   * @template TResult
   * @template TRequiredServices
   * @template TRequiredAuth
   * @template TRequiredArgs
   * @template TRequiredRequest
   * @template TRequiredFramework
   * @param {(props: import('./types.js').Props<TRequiredArgs, TRequiredServices, TRequiredAuth, TRequiredRequest, TRequiredFramework>) => Promise<TResult>} handler
   * @returns {((...args: KInitArgs) => Promise<TResult>) & { hooks: string[] }}
   */
  endpoint: (handler) => {
    const endpoint = (...args) => {
      let result = handler;
      for (let i = funcs.length - 1; i >= 0; i--) {
        result = funcs[i](result);
      }
      return result(...args);
    };
    endpoint.hooks = funcs.map(f => f.name);
    return endpoint;
  },

  raw: {
    init: [],
    args: {},
    services: {},
    auth: {},
    request: {},
    framework: {}
  }
});

export const lumo = () => pick(chain(), ['init', 'root']); 