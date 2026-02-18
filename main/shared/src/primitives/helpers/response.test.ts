// main/shared/src/primitives/helpers/response.test.ts
import { describe, expect, it } from 'vitest';

import {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
  type ApiSuccessResponse,
} from './response';

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
          correlationId: undefined,
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
          correlationId: undefined,
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
          correlationId: undefined,
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
          correlationId: undefined,
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
          error: { code: 'ERR', message: 'error', correlationId: undefined },
        }),
      ).toBe('ERR');
    });
  });

  // ==========================================================================
  // ADVERSARIAL: isSuccessResponse / isErrorResponse discriminants
  // ==========================================================================
  describe('adversarial — type guard correctness', () => {
    it('isSuccessResponse and isErrorResponse are mutually exclusive', () => {
      const success: ApiResponse<number> = { ok: true, data: 42 };
      const failure: ApiResponse<number> = {
        ok: false,
        error: { code: 'E', message: 'm', correlationId: undefined },
      };

      expect(isSuccessResponse(success)).toBe(true);
      expect(isErrorResponse(success)).toBe(false);
      expect(isSuccessResponse(failure)).toBe(false);
      expect(isErrorResponse(failure)).toBe(true);
    });

    it('isSuccessResponse returns true for null data (null is valid data)', () => {
      const response: ApiSuccessResponse<null> = { ok: true, data: null };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('isSuccessResponse returns true for undefined data', () => {
      const response: ApiSuccessResponse<undefined> = { ok: true, data: undefined };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('isSuccessResponse returns true for empty string data', () => {
      const response: ApiSuccessResponse<string> = { ok: true, data: '' };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('isSuccessResponse returns true for zero data', () => {
      const response: ApiSuccessResponse<number> = { ok: true, data: 0 };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('isSuccessResponse returns true for false data', () => {
      const response: ApiSuccessResponse<boolean> = { ok: true, data: false };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('isErrorResponse returns true for error with undefined correlationId', () => {
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: 'ERR', message: 'bad', correlationId: undefined },
      };
      expect(isErrorResponse(response)).toBe(true);
      expect(response.error.correlationId).toBeUndefined();
    });

    it('isErrorResponse returns true for error with all optional fields omitted', () => {
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: 'BARE', message: 'bare error', correlationId: undefined },
      };
      expect(isErrorResponse(response)).toBe(true);
      expect(response.error.retryAfter).toBeUndefined();
      expect(response.error.details).toBeUndefined();
    });
  });

  // ==========================================================================
  // ADVERSARIAL: response with large body
  // ==========================================================================
  describe('adversarial — large and complex data payloads', () => {
    it('success response handles very large data array (10000 items)', () => {
      const largeData = Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `user-${i}`,
        active: i % 2 === 0,
      }));
      const response: ApiSuccessResponse<typeof largeData> = { ok: true, data: largeData };
      expect(isSuccessResponse(response)).toBe(true);
      expect(response.data).toHaveLength(10_000);
      expect(response.data[9999]).toEqual({ id: 9999, name: 'user-9999', active: false });
    });

    it('success response handles deeply nested data', () => {
      type Nested = { level: number; child?: Nested };
      const buildNested = (depth: number): Nested =>
        depth === 0 ? { level: 0 } : { level: depth, child: buildNested(depth - 1) };

      const response: ApiSuccessResponse<Nested> = { ok: true, data: buildNested(20) };
      expect(isSuccessResponse(response)).toBe(true);
      expect(response.data.level).toBe(20);
    });

    it('error response handles details with many keys', () => {
      const details: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        details[`field${i}`] = `error message ${i}`;
      }
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: 'VALIDATION', message: 'Many errors', correlationId: undefined, details },
      };
      expect(isErrorResponse(response)).toBe(true);
      expect(Object.keys(response.error.details ?? {})).toHaveLength(1000);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: error response should not leak sensitive internals
  // ==========================================================================
  describe('adversarial — error field contents', () => {
    it('error response does not expose stack trace by default in the type', () => {
      // The ApiErrorResponse type has no `stack` field — verify structure is contained
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', correlationId: 'corr-1' },
      };
      // The type enforces that `stack` is not part of the public contract
      const keys = Object.keys(response.error);
      expect(keys).not.toContain('stack');
    });

    it('error code is preserved exactly (no normalization or truncation)', () => {
      const longCode = 'A'.repeat(200);
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: longCode, message: 'msg', correlationId: undefined },
      };
      expect(response.error.code).toBe(longCode);
      expect(response.error.code).toHaveLength(200);
    });

    it('retryAfter of zero is distinguishable from undefined', () => {
      const response: ApiErrorResponse = {
        ok: false,
        error: { code: 'E', message: 'm', correlationId: undefined, retryAfter: 0 },
      };
      expect(response.error.retryAfter).toBe(0);
      expect(response.error.retryAfter).not.toBeUndefined();
    });

    it('isErrorResponse correctly identifies response with retryAfter = 0', () => {
      const response: ApiResponse<string> = {
        ok: false,
        error: { code: 'RATE_LIMIT', message: 'retry now', correlationId: undefined, retryAfter: 0 },
      };
      expect(isErrorResponse(response)).toBe(true);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: type narrowing safety
  // ==========================================================================
  describe('adversarial — exhaustive narrowing', () => {
    it('handles all branches in a switch-style exhaustive handler', () => {
      function classify<T>(r: ApiResponse<T>): 'ok' | 'err' {
        if (isSuccessResponse(r)) return 'ok';
        if (isErrorResponse(r)) return 'err';
        // Should never reach here for a valid ApiResponse
        return 'err';
      }

      expect(classify<string>({ ok: true, data: 'x' })).toBe('ok');
      expect(
        classify<string>({
          ok: false,
          error: { code: 'E', message: 'm', correlationId: undefined },
        }),
      ).toBe('err');
    });

    it('isSuccessResponse used as array filter narrows types correctly', () => {
      const responses: ApiResponse<number>[] = [
        { ok: true, data: 1 },
        { ok: false, error: { code: 'E', message: 'bad', correlationId: undefined } },
        { ok: true, data: 2 },
      ];

      const successes = responses.filter(isSuccessResponse);
      expect(successes).toHaveLength(2);
      // After filtering, TypeScript knows these are ApiSuccessResponse<number>
      expect(successes[0]?.data).toBe(1);
      expect(successes[1]?.data).toBe(2);
    });

    it('isErrorResponse used as array filter narrows types correctly', () => {
      const responses: ApiResponse<number>[] = [
        { ok: true, data: 1 },
        { ok: false, error: { code: 'E1', message: 'bad1', correlationId: undefined } },
        { ok: false, error: { code: 'E2', message: 'bad2', correlationId: undefined } },
      ];

      const errors = responses.filter(isErrorResponse);
      expect(errors).toHaveLength(2);
      expect(errors[0]?.error.code).toBe('E1');
      expect(errors[1]?.error.code).toBe('E2');
    });
  });
});
