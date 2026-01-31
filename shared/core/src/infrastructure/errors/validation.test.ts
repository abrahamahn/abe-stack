// shared/core/src/infrastructure/errors/validation.test.ts
import { describe, expect, test } from 'vitest';

import { AppError } from './base';
import { BadRequestError } from './http';
import { ValidationError } from './validation';

// ============================================================================
// Validation Error Tests
// ============================================================================

describe('ValidationError', () => {
  test('should have correct properties', () => {
    const error = new ValidationError('Validation failed', {
      email: ['Invalid format'],
    });

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  test('should include fields', () => {
    const fields = {
      email: ['Invalid email format'],
      password: ['Too short', 'Must contain number'],
    };

    const error = new ValidationError('Validation failed', fields);

    expect(error.fields).toEqual(fields);
  });

  test('should extend BadRequestError', () => {
    const error = new ValidationError('Test', { field: ['Error'] });

    expect(error).toBeInstanceOf(BadRequestError);
    expect(error).toBeInstanceOf(AppError);
  });

  test('should include fields in details', () => {
    const fields = { name: ['Required'] };
    const error = new ValidationError('Validation failed', fields);

    expect(error.details).toEqual({ fields });
  });

  test('should serialize to JSON with fields', () => {
    const fields = {
      email: ['Invalid'],
      password: ['Too short'],
    };
    const error = new ValidationError('Validation failed', fields);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'ValidationError',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { fields },
    });
  });

  test('should handle single field error', () => {
    const error = new ValidationError('Invalid input', {
      email: ['Must be a valid email address'],
    });

    expect(error.fields['email']).toHaveLength(1);
    expect(error.fields['email']?.[0]).toBe('Must be a valid email address');
  });

  test('should handle multiple field errors', () => {
    const error = new ValidationError('Invalid input', {
      email: ['Invalid format'],
      password: ['Too short', 'No uppercase', 'No number'],
      name: ['Required'],
    });

    expect(Object.keys(error.fields)).toHaveLength(3);
    expect(error.fields['password']).toHaveLength(3);
  });

  test('should handle empty fields object', () => {
    const error = new ValidationError('No specific errors', {});

    expect(error.fields).toEqual({});
    expect(Object.keys(error.fields)).toHaveLength(0);
  });

  test('should handle empty error arrays', () => {
    const error = new ValidationError('Test', {
      email: [],
    });

    expect(error.fields['email']).toEqual([]);
  });

  test('should preserve field names with special characters', () => {
    const userEmailKey = 'user.email';
    const addressStreetKey = 'address[0].street';
    const fields: Record<string, string[]> = {};
    fields[userEmailKey] = ['Invalid'];
    fields[addressStreetKey] = ['Required'];
    const error = new ValidationError('Test', fields);

    expect(error.fields[userEmailKey]).toEqual(['Invalid']);
    expect(error.fields[addressStreetKey]).toEqual(['Required']);
  });

  test('should be instanceof Error', () => {
    const error = new ValidationError('Test', { field: ['Error'] });

    expect(error).toBeInstanceOf(Error);
  });

  test('should have stack trace', () => {
    const error = new ValidationError('Test', { field: ['Error'] });

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ValidationError');
  });
});
