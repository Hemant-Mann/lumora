/**
 * Content-Disposition that makes the browser name a downloaded file `name`:
 * an ASCII fallback for old browsers, and the full name UTF-8 encoded.
 * @param {string} name
 * @returns {string}
 */
export const contentDisposition = (name) =>
  `inline; filename="${name.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`
