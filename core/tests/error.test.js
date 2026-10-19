import { describe, expect, test } from '@jest/globals';
import { BadRequestError, DuplicateEntryError, LumoError } from '../error.js';
import { responseFromError } from '../response.js';

describe('LumoError', () => {
  test('can be created with only a message', () => {
    const error = new DuplicateEntryError('User already exists');
    expect(error).toBeInstanceOf(LumoError);
    expect(error.message).toBe('User already exists');
    expect(error.key).toBeUndefined();
    expect(error.metadata).toEqual({});
  });
  test('keeps its HTTP status when converted to a response', () => {
    const res = responseFromError(new BadRequestError('Bad input'));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Bad input');
  });
  test('still separates key and cause from metadata', () => {
    const cause = new Error('db down');
    const error = new BadRequestError('x', { key: 'err.x', cause, field: 'email' });
    expect(error.key).toBe('err.x');
    expect(error.cause).toBe(cause);
    expect(error.metadata).toEqual({ field: 'email' });
  });
});
