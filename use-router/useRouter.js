import { NextFunc, Props } from '../core/index.js';
import { router } from './router';

/**
 * @typedef {import('../core').Props} Props
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('./router').Router} Router
 * @typedef {import('./types').HttpMethod} HttpMethod
 * @typedef {import('./types').HttpPath} HttpPath
 */

/**
 * Executes a request through the router
 * @param {NextFunc} func - The next function in the middleware chain
 * @param {Router} r - The router instance
 * @param {Props} props - The request props
 * @returns {Promise<any>}
 */
export async function withRouter(func, r, props) {
  const { handler, params } = r.lookup({
    method: props.request.method,
    path: props.request.path
  });
  if (handler) {
    return await handler({
      ...props,
      request: {
        ...props.request,
        params: {
          ...props.request.params,
          ...params
        }
      }
    });
  }
  return await func(props);
}

/**
 * Creates a middleware that routes requests based on the provided routing configuration
 * @param {(router: Router) => Router} routing - Function that configures the router
 * @returns {(func: NextFunc) => (props: Props) => Promise<any>}
 */
export const useRouter = (routing) => {
  const r = routing(router());
  return (func) => (props) => withRouter(func, r, props);
};
