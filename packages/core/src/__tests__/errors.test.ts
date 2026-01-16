// packages/core/src/__tests__/errors.test.ts
import { describe, expect, test } from 'vitest';

import {
  BrokenError,
  ConflictError,
  getErrorStatusCode,
  getSafeErrorMessage,
  HttpError,
  isHttpError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from '../errors';

describe('HttpError classes', () => {
  describe('ValidationError', () => {
    test('should have status code 400', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
    });

    test('should have correct message', () => {
      const error = new ValidationError('Invalid email format');
      expect(error.message).toBe('Invalid email format');
    });

    test('should have correct name', () => {
      const error = new ValidationError('test');
      expect(error.name).toBe('ValidationError');
    });

    test('should be instance of HttpError', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(HttpError);
    });

    test('should be instance of Error', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('UnauthorizedError', () => {
    test('should have status code 401', () => {
      const error = new UnauthorizedError('Not authenticated');
      expect(error.statusCode).toBe(401);
    });

    test('should have correct name', () => {
      const error = new UnauthorizedError('test');
      expect(error.name).toBe('UnauthorizedError');
    });
  });

  describe('PermissionError', () => {
    test('should have status code 403', () => {
      const error = new PermissionError('Access denied');
      expect(error.statusCode).toBe(403);
    });

    test('should have correct name', () => {
      const error = new PermissionError('test');
      expect(error.name).toBe('PermissionError');
    });
  });

  describe('NotFoundError', () => {
    test('should have status code 404', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    test('should have correct name', () => {
      const error = new NotFoundError('test');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    test('should have status code 409', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
    });

    test('should have correct name', () => {
      const error = new ConflictError('test');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('UnprocessableError', () => {
    test('should have status code 422', () => {
      const error = new UnprocessableError('Invalid data');
      expect(error.statusCode).toBe(422);
    });

    test('should have correct name', () => {
      const error = new UnprocessableError('test');
      expect(error.name).toBe('UnprocessableError');
    });
  });

  describe('BrokenError', () => {
    test('should have status code 424', () => {
      const error = new BrokenError('Server invariant broken');
      expect(error.statusCode).toBe(424);
    });

    test('should have correct name', () => {
      const error = new BrokenError('test');
      expect(error.name).toBe('BrokenError');
    });
  });

  describe('RateLimitError', () => {
    test('should have status code 429', () => {
      const error = new RateLimitError('Too many requests');
      expect(error.statusCode).toBe(429);
    });

    test('should have correct name', () => {
      const error = new RateLimitError('test');
      expect(error.name).toBe('RateLimitError');
    });
  });
});

describe('isHttpError', () => {
  test('should return true for HttpError instances', () => {
    expect(isHttpError(new ValidationError('test'))).toBe(true);
    expect(isHttpError(new UnauthorizedError('test'))).toBe(true);
    expect(isHttpError(new NotFoundError('test'))).toBe(true);
    expect(isHttpError(new PermissionError('test'))).toBe(true);
    expect(isHttpError(new ConflictError('test'))).toBe(true);
    expect(isHttpError(new UnprocessableError('test'))).toBe(true);
    expect(isHttpError(new BrokenError('test'))).toBe(true);
    expect(isHttpError(new RateLimitError('test'))).toBe(true);
  });

  test('should return false for regular Error', () => {
    expect(isHttpError(new Error('test'))).toBe(false);
  });

  test('should return false for non-Error values', () => {
    expect(isHttpError('string')).toBe(false);
    expect(isHttpError(123)).toBe(false);
    expect(isHttpError(null)).toBe(false);
    expect(isHttpError(undefined)).toBe(false);
    expect(isHttpError({})).toBe(false);
    expect(isHttpError({ statusCode: 400 })).toBe(false);
  });
});

describe('getSafeErrorMessage', () => {
  describe('in development (isProduction = false)', () => {
    test('should return HttpError message', () => {
      const error = new ValidationError('Invalid email');
      expect(getSafeErrorMessage(error, false)).toBe('Invalid email');
    });

    test('should return regular Error message', () => {
      const error = new Error('Internal error details');
      expect(getSafeErrorMessage(error, false)).toBe('Internal error details');
    });

    test('should return generic message for non-Error values', () => {
      expect(getSafeErrorMessage('string error', false)).toBe('An unexpected error occurred');
      expect(getSafeErrorMessage(null, false)).toBe('An unexpected error occurred');
    });
  });

  describe('in production (isProduction = true)', () => {
    test('should return HttpError message (safe to expose)', () => {
      const error = new NotFoundError('User not found');
      expect(getSafeErrorMessage(error, true)).toBe('User not found');
    });

    test('should hide regular Error message', () => {
      const error = new Error('Database connection failed at 192.168.1.1');
      expect(getSafeErrorMessage(error, true)).toBe('An unexpected error occurred');
    });

    test('should return generic message for non-Error values', () => {
      expect(getSafeErrorMessage('string error', true)).toBe('An unexpected error occurred');
    });
  });
});

describe('getErrorStatusCode', () => {
  test('should return correct status code for HttpError', () => {
    expect(getErrorStatusCode(new ValidationError('test'))).toBe(400);
    expect(getErrorStatusCode(new UnauthorizedError('test'))).toBe(401);
    expect(getErrorStatusCode(new PermissionError('test'))).toBe(403);
    expect(getErrorStatusCode(new NotFoundError('test'))).toBe(404);
    expect(getErrorStatusCode(new ConflictError('test'))).toBe(409);
    expect(getErrorStatusCode(new UnprocessableError('test'))).toBe(422);
    expect(getErrorStatusCode(new BrokenError('test'))).toBe(424);
    expect(getErrorStatusCode(new RateLimitError('test'))).toBe(429);
  });

  test('should return 500 for regular Error', () => {
    expect(getErrorStatusCode(new Error('test'))).toBe(500);
  });

  test('should return 500 for non-Error values', () => {
    expect(getErrorStatusCode('string')).toBe(500);
    expect(getErrorStatusCode(null)).toBe(500);
    expect(getErrorStatusCode(undefined)).toBe(500);
    expect(getErrorStatusCode({})).toBe(500);
  });
});
