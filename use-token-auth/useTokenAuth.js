import { hook, NotAuthenticatedError, NotAuthorizedError } from '../core/index.js';
import jwt from 'jsonwebtoken';
import { isArray, isFunction, tryit } from 'radash';
import { Token } from './token';

/**
 * @typedef {import('../core').Props} Props
 * @typedef {import('./token').Token} Token
 */

/**
 * @typedef {Object} UseTokenAuthOptions
 * @property {'id'|'access'} [type] - The type of token required
 * @property {string} [iss] - The required issuer
 * @property {string} [aud] - The required audience
 * @property {(req: import('../core').Request) => string|null} [getToken] - Custom function to get token from request
 */

/**
 * @typedef {Object} TokenAuth
 * @property {Token} token - The decoded token
 */

/**
 * Validates token claims against the provided options
 * @param {Token} decoded - The decoded token
 * @param {UseTokenAuthOptions} options - The validation options
 * @throws {NotAuthorizedError} If token claims don't match requirements
 */
const validateClaims = (decoded, options) => {
  const { type, iss, aud } = options;

  if (type) {
    if (!decoded.type || decoded.type !== type) {
      throw new NotAuthorizedError('Given token does not have required type', {
        key: 'exo.err.jwt.caprorilous'
      });
    }
  }

  if (iss) {
    if (!decoded.iss || decoded.iss !== iss) {
      throw new NotAuthorizedError(
        'Given token does not have required issuer',
        {
          key: 'exo.err.jwt.caprisaur'
        }
      );
    }
  }

  if (aud) {
    if (!decoded.aud || decoded.aud !== aud) {
      throw new NotAuthorizedError(
        'Given token does not have required audience',
        {
          key: 'exo.err.jwt.halliphace'
        }
      );
    }
  }
};

/**
 * Verifies a JWT token
 * @param {string} token - The token to verify
 * @param {string} secret - The secret to verify against
 * @returns {Promise<Token>} The decoded token
 */
const verifyToken = async (token, secret) => {
  return await new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) =>
      err ? reject(err) : resolve(decoded)
    );
  });
};

/**
 * Extracts token from request header
 * @param {import('../core').Request} req - The request object
 * @returns {string|null} The extracted token or null
 * @throws {NotAuthenticatedError} If multiple authorization headers are present
 */
const getTokenFromHeader = (req) => {
  const header = req.headers['authorization'];
  if (isArray(header)) {
    throw new NotAuthenticatedError(
      'Multiple authorization headers are not allowed',
      {
        key: 'exo.err.jwt.multi'
      }
    );
  }
  return header?.replace(/^Bearer\s/, '') ?? null;
};

/**
 * Creates a middleware that validates JWT tokens
 * @param {string|((props: Props) => string|Promise<string>)} secret - The JWT secret or function to get it
 * @param {UseTokenAuthOptions} [options={}] - The validation options
 * @returns {Function} The middleware function
 */
export const useTokenAuth = (secret, options = {}) =>
  hook(function useTokenAuth(func) {
    return async (props) => {
      const bearerToken = options.getToken
        ? options.getToken(props.request)
        : getTokenFromHeader(props.request);

      if (!bearerToken) {
        throw new NotAuthenticatedError(
          'This function requires authentication via a token',
          {
            key: 'exo.err.jwt.canes-venatici'
          }
        );
      }

      const s = isFunction(secret)
        ? await Promise.resolve(secret(props))
        : secret;

      const [err, decoded] = await tryit(verifyToken)(bearerToken, s);

      if (err) {
        if (err.name === 'TokenExpiredError') {
          throw new NotAuthorizedError('Provided token is expired', {
            key: 'exo.err.jwt.expired',
            cause: err
          });
        }
        throw new NotAuthorizedError(
          'Cannot call this function without a valid authentication token',
          {
            key: 'exo.err.jwt.canis-major',
            cause: err
          }
        );
      }

      validateClaims(decoded, options);

      return await func({
        ...props,
        auth: {
          ...props.auth,
          token: decoded
        }
      });
    };
  });
