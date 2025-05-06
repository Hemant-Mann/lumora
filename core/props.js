import { defaultResponse } from './response.js';

/**
 * @param {import('./types.js').Request} request
 * @returns {import('./types.js').Props}
 */
export const props = (request) => ({
  auth: {},
  args: {},
  services: {},
  response: defaultResponse,
  request,
  framework: {}
}); 