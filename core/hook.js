/**
 * A helper function to more easily create hook
 * functions. Encapsulates some of the boiler
 * plate needed to create the hook structure.
 *
 * @example
 * const useCors = () => hook((func, props) => {
 *   return await func(addCorsHeaders(props))
 * })
 * @template TGivenProps
 * @template TProducedProps
 * @template TReturn
 * @param {(func: (props: TProducedProps) => any) => (props: TGivenProps) => Promise<TReturn>} fn
 * @returns {(func: (props: TProducedProps) => any) => (props: TGivenProps) => Promise<TReturn>}
 */
export function hook(fn) {
  return fn;
} 