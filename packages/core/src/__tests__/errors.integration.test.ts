// packages/core/src/__tests__/integration/errors.integration.test.ts
/**
 * Integration tests for error handling infrastructure
 *
 * Tests error classes, HTTP mapping, and response generation working together.
 */

import { describe, expect, it } from 'vitest';

import {
  AppError,
  getErrorStatusCode,
  getSafeErrorMessage,
  isAppError,
  toAppError,
} from '../infrastructure/errors/base';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '../infrastructure/errors/http';
import { isErrorResponse } from '../infrastructure/errors/response';
import { ValidationError } from '../infrastructure/errors/validation';
import { HTTP_STATUS } from './infrastructure/constants';

import type { ApiErrorResponse, ApiResponse } from '../infrastructure/errors/response';

describe('Error Infrastructure Integration', () => {
  describe('Error class hierarchy', () => {
    it('should maintain inheritance chain for HTTP errors', () => {
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

      errors.forEach((error) => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
        expect(isAppError(error)).toBe(true);
      });
    });

    it('should have correct status codes for all HTTP error types', () => {
      expect(new BadRequestError().statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(new UnauthorizedError().statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(new ForbiddenError().statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(new NotFoundError().statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(new ConflictError().statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(new UnprocessableError().statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(new TooManyRequestsError().statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(new InternalError().statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('AppError JSON serialization', () => {
    it('should serialize to consistent JSON format', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'AppError',
        message: 'Test error',
        code: 'TEST_ERROR',
        details: { field: 'value' },
      });
    });

    it('should include constructor name in serialization', () => {
      const error = new NotFoundError('Resource not found', 'RESOURCE_NOT_FOUND');
      const json = error.toJSON();

      expect(json.error).toBe('NotFoundError');
    });

    it('should handle missing optional fields', () => {
      const error = new AppError('Simple error');
      const json = error.toJSON();

      expect(json.code).toBeUndefined();
      expect(json.details).toBeUndefined();
    });
  });

  describe('Error conversion utilities', () => {
    describe('toAppError', () => {
      it('should return AppError unchanged', () => {
        const original = new BadRequestError('Invalid input');
        const converted = toAppError(original);

        expect(converted).toBe(original);
      });

      it('should convert standard Error to AppError', () => {
        const original = new Error('Standard error');
        const converted = toAppError(original);

        expect(converted).toBeInstanceOf(AppError);
        expect(converted.message).toBe('Standard error');
        expect(converted.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      });

      it('should convert non-Error values to AppError', () => {
        const cases = ['string error', 123, null, undefined, { custom: 'object' }];

        cases.forEach((value) => {
          const converted = toAppError(value);

          expect(converted).toBeInstanceOf(AppError);
          expect(converted.message).toBe('An unexpected error occurred');
        });
      });
    });

    describe('getErrorStatusCode', () => {
      it('should return status code from AppError', () => {
        expect(getErrorStatusCode(new BadRequestError())).toBe(400);
        expect(getErrorStatusCode(new NotFoundError())).toBe(404);
        expect(getErrorStatusCode(new InternalError())).toBe(500);
      });

      it('should return 500 for non-AppError', () => {
        expect(getErrorStatusCode(new Error())).toBe(500);
        expect(getErrorStatusCode('string')).toBe(500);
        expect(getErrorStatusCode(null)).toBe(500);
      });
    });

    describe('getSafeErrorMessage', () => {
      it('should return AppError message regardless of environment', () => {
        const error = new BadRequestError('Custom message');

        expect(getSafeErrorMessage(error, true)).toBe('Custom message');
        expect(getSafeErrorMessage(error, false)).toBe('Custom message');
      });

      it('should return Error message in development', () => {
        const error = new Error('Development message');

        expect(getSafeErrorMessage(error, false)).toBe('Development message');
      });

      it('should hide Error message in production', () => {
        const error = new Error('Sensitive internal error');

        expect(getSafeErrorMessage(error, true)).toBe('An unexpected error occurred');
      });

      it('should return generic message for non-Error in both environments', () => {
        expect(getSafeErrorMessage('string error', true)).toBe('An unexpected error occurred');
        expect(getSafeErrorMessage('string error', false)).toBe('An unexpected error occurred');
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const fieldErrors = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      };

      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields).toEqual(fieldErrors);
    });

    it('should include field errors in JSON', () => {
      const error = new ValidationError('Invalid input', {
        name: ['Name is required'],
      });

      const json = error.toJSON();

      expect(json.details).toEqual({
        fields: {
          name: ['Name is required'],
        },
      });
    });

    it('should access fields directly', () => {
      const error = new ValidationError('Error', {
        field1: ['Error 1'],
        field2: ['Error 2'],
      });

      expect(error.fields).toEqual({
        field1: ['Error 1'],
        field2: ['Error 2'],
      });
    });
  });

  describe('Error to JSON conversion', () => {
    it('should convert AppError to JSON response', () => {
      const error = new BadRequestError('Invalid input', 'INVALID_INPUT');
      const json = error.toJSON();

      expect(json.error).toBe('BadRequestError');
      expect(json.message).toBe('Invalid input');
      expect(json.code).toBe('INVALID_INPUT');
    });

    it('should include details in JSON', () => {
      const error = new UnprocessableError('Business rule violation', 'RULE_VIOLATION', {
        field: 'amount',
        reason: 'Exceeds limit',
      });
      const json = error.toJSON();

      expect(json.details).toEqual({
        field: 'amount',
        reason: 'Exceeds limit',
      });
    });
  });

  describe('isErrorResponse type guard', () => {
    it('should return true for error responses', () => {
      const errorResponse: ApiErrorResponse = {
        ok: false,
        error: {
          code: 'ERROR_CODE',
          message: 'Something went wrong',
        },
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it('should return false for success responses', () => {
      const successResponse: ApiResponse<{ id: string }> = {
        ok: true,
        data: { id: '123' },
      };

      expect(isErrorResponse(successResponse)).toBe(false);
    });

    it('should work with error response containing details', () => {
      const errorResponse: ApiErrorResponse = {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email' },
        },
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
    });
  });

  describe('TooManyRequestsError with retry-after', () => {
    it('should include retryAfter property', () => {
      const error = new TooManyRequestsError('Rate limited', 60);

      expect(error.retryAfter).toBe(60);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should work without retryAfter', () => {
      const error = new TooManyRequestsError();

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('Real-world error scenarios', () => {
    it('should handle API validation error flow', () => {
      // Simulate validating API input and creating error response
      const validationErrors = {
        email: ['Invalid email format'],
        password: ['Must be at least 8 characters'],
      };

      const error = new ValidationError('Request validation failed', validationErrors);

      // Get status code for HTTP response
      const statusCode = getErrorStatusCode(error);
      expect(statusCode).toBe(400);

      // Convert to JSON for response body
      const json = error.toJSON();
      expect(json.message).toBe('Request validation failed');
      expect(json.details).toEqual({ fields: validationErrors });
    });

    it('should handle authentication error flow', () => {
      const error = new UnauthorizedError('Invalid token', 'TOKEN_EXPIRED');

      const statusCode = getErrorStatusCode(error);
      expect(statusCode).toBe(401);

      const safeMessage = getSafeErrorMessage(error, true);
      expect(safeMessage).toBe('Invalid token');

      const json = error.toJSON();
      expect(json.code).toBe('TOKEN_EXPIRED');
    });

    it('should handle resource not found flow', () => {
      const error = new NotFoundError('User not found', 'USER_NOT_FOUND');

      const statusCode = getErrorStatusCode(error);
      expect(statusCode).toBe(404);

      const json = error.toJSON();
      expect(json.error).toBe('NotFoundError');
      expect(json.code).toBe('USER_NOT_FOUND');
    });

    it('should handle conflict error for duplicate resources', () => {
      const error = new ConflictError('Email already exists', 'DUPLICATE_EMAIL');

      expect(error.statusCode).toBe(409);

      const json = error.toJSON();
      expect(json.message).toBe('Email already exists');
      expect(json.code).toBe('DUPLICATE_EMAIL');
    });

    it('should handle business logic error', () => {
      const error = new UnprocessableError('Cannot delete last admin', 'LAST_ADMIN', {
        adminCount: 1,
        minRequired: 1,
      });

      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({
        adminCount: 1,
        minRequired: 1,
      });
    });

    it('should handle internal error in production', () => {
      const internalError = new Error('Database connection failed: ECONNREFUSED');

      // In production, should hide internal details
      const safeMessage = getSafeErrorMessage(internalError, true);
      expect(safeMessage).toBe('An unexpected error occurred');

      // Convert to AppError for consistent handling
      const appError = toAppError(internalError);
      expect(appError.statusCode).toBe(500);
    });

    it('should handle rate limiting scenario', () => {
      const error = new TooManyRequestsError('Too many login attempts', 300);

      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(300);

      const json = error.toJSON();
      expect(json.error).toBe('TooManyRequestsError');
    });
  });

  describe('Error chain conversion', () => {
    it('should handle error conversion chain', () => {
      // Start with unknown error
      const originalError: unknown = 'Something went wrong';

      // Check if it's an AppError
      const isApp = isAppError(originalError);
      expect(isApp).toBe(false);

      // Convert to AppError
      const appError = toAppError(originalError);
      expect(isAppError(appError)).toBe(true);

      // Get status code
      const status = getErrorStatusCode(appError);
      expect(status).toBe(500);

      // Convert to JSON
      const json = appError.toJSON();
      expect(json.message).toBe('An unexpected error occurred');
    });

    it('should preserve error details through conversion', () => {
      const original = new BadRequestError('Invalid data', 'INVALID_DATA');

      // Conversion should return same instance
      const converted = toAppError(original);
      expect(converted).toBe(original);

      // All properties preserved
      expect(converted.message).toBe('Invalid data');
      expect(converted.code).toBe('INVALID_DATA');
      expect(converted.statusCode).toBe(400);
    });
  });
});
