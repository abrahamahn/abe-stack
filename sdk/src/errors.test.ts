// sdk/src/errors.test.ts
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '@abe-stack/core';
import { describe, expect, it } from 'vitest';

import {
  ApiError,
  NetworkError,
  TimeoutError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
} from './errors';

describe('SDK Errors', () => {
  describe('ApiError', () => {
    it('should create error with status and message', () => {
      const error = new ApiError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('should create error with code and details', () => {
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', {
        field: 'email',
      });
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should identify client errors', () => {
      const clientError = new ApiError('Bad request', 400);
      const serverError = new ApiError('Server error', 500);

      expect(clientError.isClientError()).toBe(true);
      expect(clientError.isServerError()).toBe(false);
      expect(serverError.isClientError()).toBe(false);
      expect(serverError.isServerError()).toBe(true);
    });

    it('should identify retryable errors', () => {
      const rateLimited = new ApiError('Too many requests', 429);
      const serverError = new ApiError('Server error', 500);
      const notFound = new ApiError('Not found', 404);

      expect(rateLimited.isRetryable()).toBe(true);
      expect(serverError.isRetryable()).toBe(true);
      expect(notFound.isRetryable()).toBe(false);
    });
  });

  describe('NetworkError', () => {
    it('should create error with default message', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network request failed');
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should preserve original error', () => {
      const original = new Error('fetch failed');
      const error = new NetworkError('Custom message', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('TimeoutError', () => {
    it('should create error with default message', () => {
      const error = new TimeoutError();
      expect(error.message).toBe('Request timed out');
      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TIMEOUT_ERROR');
    });

    it('should include timeout duration', () => {
      const error = new TimeoutError('Request timed out', 5000);
      expect(error.timeoutMs).toBe(5000);
      expect(error.details).toEqual({ timeoutMs: 5000 });
    });
  });

  describe('createApiError', () => {
    it('should create BadRequestError for 400', () => {
      const error = createApiError(400, { message: 'Invalid input' });
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Invalid input');
    });

    it('should create UnauthorizedError for 401', () => {
      const error = createApiError(401, { message: 'Invalid token' });
      expect(error).toBeInstanceOf(UnauthorizedError);
    });

    it('should create ForbiddenError for 403', () => {
      const error = createApiError(403, { message: 'Access denied' });
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should create NotFoundError for 404', () => {
      const error = createApiError(404, { message: 'User not found' });
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should create ConflictError for 409', () => {
      const error = createApiError(409, { message: 'Email already exists' });
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should create UnprocessableError for 422', () => {
      const error = createApiError(422, { message: 'Semantic error' });
      expect(error).toBeInstanceOf(UnprocessableError);
    });

    it('should create TooManyRequestsError for 429', () => {
      const error = createApiError(429, { message: 'Rate limited' });
      expect(error).toBeInstanceOf(TooManyRequestsError);
    });

    it('should create InternalError for 5xx', () => {
      const error500 = createApiError(500, { message: 'Server error' });
      const error502 = createApiError(502, { message: 'Bad gateway' });

      expect(error500).toBeInstanceOf(InternalError);
      expect(error502).toBeInstanceOf(InternalError);
    });

    it('should create ApiError for other status codes', () => {
      const error = createApiError(418, { message: "I'm a teapot" });
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(418);
    });

    it('should use default message when not provided', () => {
      const error = createApiError(404);
      expect(error.message).toBe('HTTP 404');
    });

    it('should preserve error code and details', () => {
      const error = createApiError(400, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid format' },
      });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email', reason: 'invalid format' });
    });
  });

  describe('type guards', () => {
    it('isApiError should identify ApiError instances', () => {
      const apiError = new ApiError('Test', 400);
      const regularError = new Error('Test');

      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(regularError)).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError('string')).toBe(false);
    });

    it('isNetworkError should identify NetworkError instances', () => {
      const networkError = new NetworkError();
      const regularError = new Error('Test');

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(regularError)).toBe(false);
    });

    it('isTimeoutError should identify TimeoutError instances', () => {
      const timeoutError = new TimeoutError();
      const regularError = new Error('Test');

      expect(isTimeoutError(timeoutError)).toBe(true);
      expect(isTimeoutError(regularError)).toBe(false);
    });

    it('isUnauthorizedError should identify UnauthorizedError instances', () => {
      const unauthorizedError = new UnauthorizedError('Invalid token');
      const apiError = new ApiError('Test', 401);

      expect(isUnauthorizedError(unauthorizedError)).toBe(true);
      expect(isUnauthorizedError(apiError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from ApiError', () => {
      const error = new ApiError('API failed', 500);
      expect(getErrorMessage(error)).toBe('API failed');
    });

    it('should extract message from regular Error', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return default message for non-Error values', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage({ message: 'object' })).toBe('An unexpected error occurred');
    });

    it('should return the string itself for string errors', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });
  });
});
