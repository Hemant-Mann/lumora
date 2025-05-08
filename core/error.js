import { omit } from 'radash';

/**
 * @template TMetadata
 */
export class LumoError extends Error {
  /**
   * @type {Omit<TMetadata, 'key' | 'cause'>}
   */
  metadata;
  /**
   * @type {string}
   */
  key;
  /**
   * @type {number}
   */
  status = 500;
  /**
   * @type {Error | undefined}
   */
  cause;

  /**
   * @param {string} message
   * @param {TMetadata & { key: string; cause?: Error }} metadata
   */
  constructor(message, metadata) {
    super(message);
    this.cause = metadata.cause;
    this.key = metadata.key;
    this.metadata = omit(metadata, ['cause', 'key']);
  }
}

export class BadRequestError extends LumoError {
  status = 400;
}

export class NotAuthenticatedError extends LumoError {
  status = 401;
}

export class NotAuthorizedError extends LumoError {
  status = 403;
}

export class RateLimitError extends LumoError {
  status = 429;
}

export class InternalServerError extends LumoError {
  status = 500;
} 