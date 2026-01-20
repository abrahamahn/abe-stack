// packages/core/src/infrastructure/errors/__tests__/response.test.ts
import { describe, expect, it } from 'vitest';

import {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
  type ApiSuccessResponse,
} from '../response';

describe('API Response Types', () => {
  describe('ApiSuccessResponse', () => {
    it('should have correct structure', () => {
      const response: ApiSuccessResponse<{ id: string }> = {
        ok: true,
        data: { id: '123' },
      };

      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ id: '123' });
    });
  });

  describe('ApiErrorResponse', () => {
    it('should have correct structure', () => {
      const response: ApiErrorResponse = {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      };

      expect(response.ok).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Invalid input');
    });

    it('should support optional fields', () => {
      const response: ApiErrorResponse = {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { limit: 100 },
          retryAfter: 60,
          correlationId: 'abc-123',
        },
      };

      expect(response.error.details).toEqual({ limit: 100 });
      expect(response.error.retryAfter).toBe(60);
      expect(response.error.correlationId).toBe('abc-123');
    });
  });

  describe('isSuccessResponse', () => {
    it('should return true for success response', () => {
      const response: ApiResponse<string> = {
        ok: true,
        data: 'success',
      };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it('should return false for error response', () => {
      const response: ApiResponse<string> = {
        ok: false,
        error: {
          code: 'ERROR',
          message: 'Something went wrong',
        },
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const response: ApiResponse<{ id: string }> = {
        ok: true,
        data: { id: '123' },
      };

      if (isSuccessResponse(response)) {
        // TypeScript should know response.data exists
        expect(response.data.id).toBe('123');
      }
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for error response', () => {
      const response: ApiResponse<string> = {
        ok: false,
        error: {
          code: 'ERROR',
          message: 'Something went wrong',
        },
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return false for success response', () => {
      const response: ApiResponse<string> = {
        ok: true,
        data: 'success',
      };

      expect(isErrorResponse(response)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const response: ApiResponse<string> = {
        ok: false,
        error: {
          code: 'ERROR',
          message: 'Something went wrong',
        },
      };

      if (isErrorResponse(response)) {
        // TypeScript should know response.error exists
        expect(response.error.code).toBe('ERROR');
      }
    });
  });

  describe('ApiResponse union type', () => {
    it('should work with either success or error', () => {
      function handleResponse<T>(response: ApiResponse<T>): string {
        if (isSuccessResponse(response)) {
          return 'success';
        }
        return response.error.code;
      }

      expect(handleResponse({ ok: true, data: 'test' })).toBe('success');
      expect(
        handleResponse({
          ok: false,
          error: { code: 'ERR', message: 'error' },
        }),
      ).toBe('ERR');
    });
  });
});
