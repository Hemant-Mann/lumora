import { ParamParser } from '../use-router/param-parser';

/**
 * @typedef {import('../core').NextFunc} NextFunc
 * @typedef {import('../core').Props} Props
 */

/**
 * Middleware function to parse path parameters
 * @param {NextFunc} func - The next function in the middleware chain
 * @param {Object} parser - The parameter parser instance
 * @param {Props} props - The request props
 * @returns {Promise<any>}
 */
export async function withPathParser(func, parser, props) {
  const params = parser.parse(props.request.path);
  return await func({
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

/**
 * Creates a middleware that parses path parameters based on a template
 * @param {string} template - The path template with named parameters
 * @returns {(func: NextFunc) => (props: Props) => Promise<any>}
 */
export const usePathParser = (template) => {
  const parser = ParamParser(template);
  return (func) => {
    return (props) => withPathParser(func, parser, props);
  };
};
