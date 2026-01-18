// packages/core/src/errors/__tests__/http.test.ts
import { describe, expect, test } from 'vitest';

import { AppError } from '../base';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '../http';

// ============================================================================
// HTTP Errors Tests
// ============================================================================

describe('HTTP errors', () => {
  describe('BadRequestError', () => {
    test('should have 400 status', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    test('should accept custom message', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.message).toBe('Invalid input');
    });

    test('should accept code and details', () => {
      const error = new BadRequestError('Invalid', 'INVALID_INPUT', { field: 'email' });

      expect(error.code).toBe('INVALID_INPUT');
      expect(error.details).toEqual({ field: 'email' });
    });

    test('should extend AppError', () => {
      const error = new BadRequestError();

      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('UnauthorizedError', () => {
    test('should have 401 status', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    test('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });

    test('should accept code', () => {
      const error = new UnauthorizedError('Invalid', 'INVALID_TOKEN');

      expect(error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('ForbiddenError', () => {
    test('should have 403 status', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    test('should accept custom message', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.message).toBe('Access denied');
    });

    test('should accept code', () => {
      const error = new ForbiddenError('Access denied', 'INSUFFICIENT_PERMISSIONS');

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('NotFoundError', () => {
    test('should have 404 status', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    test('should accept custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });

    test('should accept code', () => {
      const error = new NotFoundError('Not found', 'RESOURCE_NOT_FOUND');

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    test('should have 409 status', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });

    test('should accept custom message', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
    });

    test('should accept code', () => {
      const error = new ConflictError('Conflict', 'DUPLICATE_EMAIL');

      expect(error.code).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('UnprocessableError', () => {
    test('should have 422 status', () => {
      const error = new UnprocessableError();

      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Unprocessable entity');
    });

    test('should accept custom message', () => {
      const error = new UnprocessableError('Invalid operation');

      expect(error.message).toBe('Invalid operation');
    });

    test('should accept code and details', () => {
      const error = new UnprocessableError('Invalid', 'BUSINESS_RULE', { reason: 'test' });

      expect(error.code).toBe('BUSINESS_RULE');
      expect(error.details).toEqual({ reason: 'test' });
    });
  });

  describe('TooManyRequestsError', () => {
    test('should have 429 status', () => {
      const error = new TooManyRequestsError();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMITED');
    });

    test('should accept retryAfter', () => {
      const error = new TooManyRequestsError('Rate limited', 60);

      expect(error.retryAfter).toBe(60);
    });

    test('should have undefined retryAfter when not provided', () => {
      const error = new TooManyRequestsError();

      expect(error.retryAfter).toBeUndefined();
    });

    test('should accept custom message', () => {
      const error = new TooManyRequestsError('Slow down');

      expect(error.message).toBe('Slow down');
    });
  });

  describe('InternalError', () => {
    test('should have 500 status', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });

    test('should accept custom message', () => {
      const error = new InternalError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
    });

    test('should accept code', () => {
      const error = new InternalError('Database error', 'DB_CONNECTION_FAILED');

      expect(error.code).toBe('DB_CONNECTION_FAILED');
    });
  });

  describe('error hierarchy', () => {
    test('all HTTP errors should extend AppError', () => {
      expect(new BadRequestError()).toBeInstanceOf(AppError);
      expect(new UnauthorizedError()).toBeInstanceOf(AppError);
      expect(new ForbiddenError()).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
      expect(new UnprocessableError()).toBeInstanceOf(AppError);
      expect(new TooManyRequestsError()).toBeInstanceOf(AppError);
      expect(new InternalError()).toBeInstanceOf(AppError);
    });

    test('all HTTP errors should be instances of Error', () => {
      expect(new BadRequestError()).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError()).toBeInstanceOf(Error);
      expect(new ConflictError()).toBeInstanceOf(Error);
      expect(new UnprocessableError()).toBeInstanceOf(Error);
      expect(new TooManyRequestsError()).toBeInstanceOf(Error);
      expect(new InternalError()).toBeInstanceOf(Error);
    });

    test('all HTTP errors should have toJSON method', () => {
      const errors = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new UnprocessableError(),
        new TooManyRequestsError(),
        new InternalError(),
      ];

      for (const error of errors) {
        const json = error.toJSON();
        expect(json).toHaveProperty('error');
        expect(json).toHaveProperty('message');
      }
    });
  });
});
