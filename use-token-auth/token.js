import dur from 'durhuman';
import jwt from 'jsonwebtoken';

/**
 * @typedef {Object} Token
 * @property {string} exp - The seconds timestamp when the token should expire. Auto set, based on the ttl when using the createToken function.
 * @property {string} sub - The subject of the token, _who_ the token represents. Typically, thats the id of the user.
 * @property {string} iss - The entity issuing the token, typically the name of your own system.
 * @property {string} iat - The seconds timestamp the token was issued at. Auto set, when using the createToken function.
 * @property {'id'|'access'} type - The type of token. There are two types: id and access. It's important to understand the difference but in short: id tokens are for people/users and access tokens are for systems/services.
 * @property {string} aud - The audience intended to receive the token.
 * @property {string} ttl - In text (e.g. '2 weeks'), how long the token should live until it expires.
 * @property {string[]} permissions - A string list of permissions.
 * @property {string[]} roles - A string list of roles.
 * @property {string[]} scopes - A string list of scopes.
 * @property {Object} extra - Any additional information you need can be stored here.
 */

/**
 * Creates a JWT token with the provided payload
 * @param {string} secret - The secret to sign the token with
 * @param {Partial<Token>} token - The token payload
 * @returns {string} The signed JWT token
 */
export const createToken = (secret, token) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...token,
    iat: now,
    exp: now + dur(token.ttl, 'seconds'),
    permissions: token.permissions ?? [],
    roles: token.roles ?? [],
    scopes: token.scopes ?? [],
    extra: token.extra ?? {}
  };
  return jwt.sign(payload, secret);
};
