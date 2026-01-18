// packages/core/src/errors/__tests__/base.test.ts
import { describe, expect, test } from 'vitest';

import { AppError, getErrorStatusCode, getSafeErrorMessage, isAppError, toAppError } from '../base';

// ============================================================================
// Base Error Tests
// ============================================================================

describe('base errors', () => {
  describe('AppError', () => {
    test('should create error with default status code', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    test('should create error with custom status code', () => {
      const error = new AppError('Test error', 400);

      expect(error.statusCode).toBe(400);
    });

    test('should create error with code and details', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE', { field: 'value' });

      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ field: 'value' });
    });

    test('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE', { foo: 'bar' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'AppError',
        message: 'Test error',
        code: 'TEST_CODE',
        details: { foo: 'bar' },
      });
    });

    test('should serialize to JSON without optional fields', () => {
      const error = new AppError('Simple error');
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'AppError',
        message: 'Simple error',
        code: undefined,
        details: undefined,
      });
    });

    test('should be an instance of Error', () => {
      const error = new AppError('Test');

      expect(error).toBeInstanceOf(Error);
    });

    test('should have a stack trace', () => {
      const error = new AppError('Test');

      expect(error.stack).toBeDefined();
    });

    test('should capture correct function in stack trace', () => {
      const error = new AppError('Test');

      expect(error.stack).toContain('AppError');
    });
  });

  describe('isAppError', () => {
    test('should return true for AppError instances', () => {
      expect(isAppError(new AppError('test'))).toBe(true);
    });

    test('should return false for regular Error', () => {
      expect(isAppError(new Error('test'))).toBe(false);
    });

    test('should return false for string', () => {
      expect(isAppError('string')).toBe(false);
    });

    test('should return false for null', () => {
      expect(isAppError(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    test('should return false for number', () => {
      expect(isAppError(123)).toBe(false);
    });

    test('should return false for object that looks like AppError', () => {
      const fake = { message: 'test', statusCode: 400, name: 'AppError' };
      expect(isAppError(fake)).toBe(false);
    });
  });

  describe('toAppError', () => {
    test('should return same error if already AppError', () => {
      const original = new AppError('Original', 400);
      const result = toAppError(original);

      expect(result).toBe(original);
    });

    test('should convert Error to AppError with 500 status', () => {
      const original = new Error('Some error');
      const result = toAppError(original);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('Some error');
    });

    test('should convert unknown to AppError with 500 status', () => {
      const result = toAppError('string error');

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('An unexpected error occurred');
    });

    test('should handle null', () => {
      const result = toAppError(null);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.statusCode).toBe(500);
    });

    test('should handle undefined', () => {
      const result = toAppError(undefined);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.statusCode).toBe(500);
    });

    test('should handle number', () => {
      const result = toAppError(404);

      expect(result.message).toBe('An unexpected error occurred');
    });

    test('should handle object', () => {
      const result = toAppError({ foo: 'bar' });

      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('getSafeErrorMessage', () => {
    test('should return AppError message in production', () => {
      const error = new AppError('Safe message');
      const result = getSafeErrorMessage(error, true);

      expect(result).toBe('Safe message');
    });

    test('should return AppError message in development', () => {
      const error = new AppError('Safe message');
      const result = getSafeErrorMessage(error, false);

      expect(result).toBe('Safe message');
    });

    test('should hide regular Error message in production', () => {
      const error = new Error('Internal detail');
      const result = getSafeErrorMessage(error, true);

      expect(result).toBe('An unexpected error occurred');
    });

    test('should show regular Error message in development', () => {
      const error = new Error('Internal detail');
      const result = getSafeErrorMessage(error, false);

      expect(result).toBe('Internal detail');
    });

    test('should return generic message for unknown in production', () => {
      const result = getSafeErrorMessage('string error', true);

      expect(result).toBe('An unexpected error occurred');
    });

    test('should return generic message for unknown in development', () => {
      const result = getSafeErrorMessage('string error', false);

      expect(result).toBe('An unexpected error occurred');
    });
  });

  describe('getErrorStatusCode', () => {
    test('should return status code from AppError', () => {
      const error = new AppError('Test', 404);
      const result = getErrorStatusCode(error);

      expect(result).toBe(404);
    });

    test('should return 500 for regular Error', () => {
      const error = new Error('Test');
      const result = getErrorStatusCode(error);

      expect(result).toBe(500);
    });

    test('should return 500 for unknown error types', () => {
      expect(getErrorStatusCode('string')).toBe(500);
      expect(getErrorStatusCode(null)).toBe(500);
      expect(getErrorStatusCode(undefined)).toBe(500);
      expect(getErrorStatusCode(123)).toBe(500);
    });
  });
});
