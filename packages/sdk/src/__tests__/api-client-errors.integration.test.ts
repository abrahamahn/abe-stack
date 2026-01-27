// packages/sdk/src/__tests__/integration/api-client-errors.integration.test.ts
/**
 * Integration tests for API client error handling across modules.
 *
 * Tests error mapping, error type guards, and error handling in various scenarios.
 */

import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, type ApiClient } from '../api/client';
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
} from '../errors';

// ============================================================================
// Mock Fetch
// ============================================================================

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

let mockFetch: any;

function createMockResponse(status: number, body: unknown): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('API Client Error Handling Integration', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createApiError', () => {
    it('should map 400 to BadRequestError', () => {
      const error = createApiError(400, { message: 'Invalid input', code: 'VALIDATION_ERROR' });

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should map 401 to UnauthorizedError', () => {
      const error = createApiError(401, { message: 'Invalid credentials' });

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });

    it('should map 403 to ForbiddenError', () => {
      const error = createApiError(403, { message: 'Access denied' });

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });

    it('should map 404 to NotFoundError', () => {
      const error = createApiError(404, { message: 'User not found' });

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('should map 409 to ConflictError', () => {
      const error = createApiError(409, { message: 'Email already exists' });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
    });

    it('should map 422 to UnprocessableError', () => {
      const error = createApiError(422, {
        message: 'Validation failed',
        details: { email: 'Invalid format' },
      });

      expect(error).toBeInstanceOf(UnprocessableError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      // Verify details are preserved
      expect((error as UnprocessableError).details).toEqual({ email: 'Invalid format' });
    });

    it('should map 429 to TooManyRequestsError', () => {
      const error = createApiError(429, { message: 'Rate limit exceeded' });

      expect(error).toBeInstanceOf(TooManyRequestsError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
    });

    it('should map 5xx to InternalError', () => {
      const error500 = createApiError(500, { message: 'Internal server error' });
      expect(error500).toBeInstanceOf(InternalError);
      expect(error500.message).toBe('Internal server error');
      // InternalError always uses statusCode 500 regardless of input status
      expect(error500.statusCode).toBe(500);

      const error502 = createApiError(502, { message: 'Bad gateway' });
      expect(error502).toBeInstanceOf(InternalError);
      expect(error502.message).toBe('Bad gateway');
      // InternalError normalizes all 5xx to 500
      expect(error502.statusCode).toBe(500);

      const error503 = createApiError(503, { message: 'Service unavailable' });
      expect(error503).toBeInstanceOf(InternalError);
      expect(error503.message).toBe('Service unavailable');
      // InternalError normalizes all 5xx to 500
      expect(error503.statusCode).toBe(500);
    });

    it('should map unknown status to ApiError', () => {
      const error = createApiError(418, { message: "I'm a teapot" });

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(418);
    });

    it('should handle missing message', () => {
      const error = createApiError(400);

      expect(error.message).toBe('HTTP 400');
    });
  });

  describe('ApiError class', () => {
    it('should identify client errors', () => {
      const error = new ApiError('Client error', 400);
      expect(error.isClientError()).toBe(true);
      expect(error.isServerError()).toBe(false);
    });

    it('should identify server errors', () => {
      const error = new ApiError('Server error', 500);
      expect(error.isClientError()).toBe(false);
      expect(error.isServerError()).toBe(true);
    });

    it('should identify retryable errors', () => {
      const rateLimitError = new ApiError('Rate limit', 429);
      expect(rateLimitError.isRetryable()).toBe(true);

      const serverError = new ApiError('Server error', 500);
      expect(serverError.isRetryable()).toBe(true);

      const clientError = new ApiError('Bad request', 400);
      expect(clientError.isRetryable()).toBe(false);
    });
  });

  describe('NetworkError', () => {
    it('should capture original error', () => {
      const originalError = new Error('Connection refused');
      const networkError = new NetworkError('Request failed', originalError);

      expect(networkError.originalError).toBe(originalError);
      expect(networkError.message).toBe('Request failed');
    });

    it('should have status 0', () => {
      const error = new NetworkError();
      expect(error.statusCode).toBe(0);
    });
  });

  describe('TimeoutError', () => {
    it('should capture timeout duration', () => {
      const error = new TimeoutError('Request timed out', 5000);

      expect(error.timeoutMs).toBe(5000);
      expect(error.message).toBe('Request timed out');
    });
  });

  describe('Type guards', () => {
    it('isApiError should identify ApiError instances', () => {
      const apiError = new ApiError('Test', 400);
      const otherError = new Error('Test');

      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(otherError)).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });

    it('isNetworkError should identify NetworkError instances', () => {
      const networkError = new NetworkError();
      const otherError = new Error('Test');

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(otherError)).toBe(false);
    });

    it('isTimeoutError should identify TimeoutError instances', () => {
      const timeoutError = new TimeoutError();
      const otherError = new Error('Test');

      expect(isTimeoutError(timeoutError)).toBe(true);
      expect(isTimeoutError(otherError)).toBe(false);
    });

    it('isUnauthorizedError should identify UnauthorizedError instances', () => {
      const unauthorizedError = new UnauthorizedError('Test');
      const otherError = new Error('Test');

      expect(isUnauthorizedError(unauthorizedError)).toBe(true);
      expect(isUnauthorizedError(otherError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from AppError', () => {
      const error = new BadRequestError('Validation failed');
      expect(getErrorMessage(error)).toBe('Validation failed');
    });

    it('should extract message from regular Error', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return default message for non-errors', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage('string')).toBe('An unexpected error occurred');
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    });
  });

  describe('API Client integration', () => {
    let client: ApiClient;

    beforeEach(() => {
      client = createApiClient({
        baseUrl: 'http://localhost:3000',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await client.login({ email: 'test@test.com', password: 'password' });
        expect.fail('Expected NetworkError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).statusCode).toBe(0);
      }
    });

    it('should throw UnauthorizedError on 401', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401, { message: 'Invalid credentials' }));

      try {
        await client.login({ email: 'test@test.com', password: 'wrong' });
        expect.fail('Expected UnauthorizedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe('Invalid credentials');
        expect((error as UnauthorizedError).statusCode).toBe(401);
      }
    });

    it('should throw BadRequestError on 400', async () => {
      mockFetch.mockResolvedValue(createMockResponse(400, { message: 'Invalid email format' }));

      try {
        await client.login({ email: 'invalid', password: 'password' });
        expect.fail('Expected BadRequestError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toBe('Invalid email format');
        expect((error as BadRequestError).statusCode).toBe(400);
      }
    });

    it('should throw TooManyRequestsError on 429', async () => {
      mockFetch.mockResolvedValue(createMockResponse(429, { message: 'Too many login attempts' }));

      try {
        await client.login({ email: 'test@test.com', password: 'password' });
        expect.fail('Expected TooManyRequestsError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TooManyRequestsError);
        expect((error as TooManyRequestsError).message).toBe('Too many login attempts');
        expect((error as TooManyRequestsError).statusCode).toBe(429);
      }
    });

    it('should throw InternalError on 500', async () => {
      mockFetch.mockResolvedValue(createMockResponse(500, { message: 'Server error' }));

      try {
        await client.login({ email: 'test@test.com', password: 'password' });
        expect.fail('Expected InternalError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError).message).toBe('Server error');
        expect((error as InternalError).statusCode).toBe(500);
      }
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error('No body')),
      });

      await expect(client.login({ email: 'test@test.com', password: 'password' })).rejects.toThrow(
        BadRequestError,
      );
    });

    it('should return data on success', async () => {
      const responseData = {
        user: { id: 'u1', email: 'test@test.com' },
        token: 'token123',
      };

      mockFetch.mockResolvedValue(createMockResponse(200, responseData));

      const result = await client.login({ email: 'test@test.com', password: 'password' });

      expect(result.token).toBe('token123');
    });
  });

  describe('Error handling patterns', () => {
    it('should allow catch-all error handling', () => {
      const error = createApiError(500, { message: 'Server error' });

      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(500);
      }
    });

    it('should allow specific error handling', () => {
      const errors = [
        createApiError(400, { message: 'Bad request' }),
        createApiError(401, { message: 'Unauthorized' }),
        createApiError(404, { message: 'Not found' }),
        createApiError(500, { message: 'Server error' }),
      ];

      const results: string[] = [];

      for (const error of errors) {
        if (error instanceof UnauthorizedError) {
          results.push('redirect-to-login');
        } else if (error instanceof BadRequestError) {
          results.push('show-validation-errors');
        } else if (error instanceof NotFoundError) {
          results.push('show-404-page');
        } else if (error instanceof InternalError) {
          results.push('show-error-toast');
        }
      }

      expect(results).toEqual([
        'show-validation-errors',
        'redirect-to-login',
        'show-404-page',
        'show-error-toast',
      ]);
    });

    it('should preserve error details through the chain', () => {
      const error = createApiError(422, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { email: ['Invalid format'], password: ['Too short'] },
      });

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');

      if (error instanceof UnprocessableError) {
        expect(error.details).toEqual({
          email: ['Invalid format'],
          password: ['Too short'],
        });
      }
    });
  });

  describe('Error recovery patterns', () => {
    it('should support retry on retryable errors', async () => {
      let attempts = 0;
      const maxRetries = 3;

      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts < maxRetries) {
          return Promise.resolve(createMockResponse(500, { message: 'Server error' }));
        }
        return Promise.resolve(createMockResponse(200, { success: true }));
      });

      const client = createApiClient({
        baseUrl: 'http://localhost:3000',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      // Manual retry logic
      let result: unknown;

      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await client.getCurrentUser();
          break;
        } catch (error) {
          if (!(error instanceof AppError) || !isRetryableError(error)) {
            throw error;
          }
        }
      }

      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });
  });
});

// Helper for the retry test
function isRetryableError(error: AppError): boolean {
  if (error instanceof ApiError) {
    return error.isRetryable();
  }
  return error.statusCode >= 500 || error.statusCode === 429;
}
