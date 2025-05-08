/**
 * @typedef {Object} TemplateSegment
 * @property {string} raw
 * @property {boolean} isVariable
 * @property {string|null} name
 * @property {number} index
 */

/**
 * Creates a parameter parser for URL paths with named parameters
 * @param {string} template - The developer provided path with named parameter templates
 * @example
 * /libraries/{library}/books/{book}/checkout
 * @returns {Object} A parser object with a parse method
 */
export const ParamParser = (template) => {
  const templateParts = template
    .split('/')
    .map((raw, index) => {
      const isVar = raw.match(/^{[^\/]+}$/);
      return {
        raw,
        isVariable: !!isVar,
        name: isVar ? raw.substring(1, raw.length - 1) : null,
        index
      };
    });

  return {
    /**
     * Parses a URL path and extracts parameters based on the template
     * @param {string} path - The actual runtime url path that is being called
     * @example
     * /library/ny-public-library/books/art-of-war/checkout
     * @returns {Object} Object containing the extracted parameters
     */
    parse(path) {
      const params = {};
      const pathParts = path.split('/');
      
      for (const segment of templateParts) {
        const pathPart = pathParts[segment.index];
        if (segment.isVariable) {
          params[segment.name] = pathPart;
          continue;
        }
        if (segment.raw !== pathPart) {
          return params;
        }
      }
      return params;
    }
  };
};
