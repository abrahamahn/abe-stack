// packages/core/src/contracts/__tests__/common.test.ts
import { describe, expect, it } from 'vitest';

import {
  emailSchema,
  errorResponseSchema,
  nameSchema,
  passwordSchema,
  requiredNameSchema,
  uuidSchema,
} from '../common';

describe('emailSchema', () => {
  it('should validate correct email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test.user@domain.org',
      'name+tag@example.co.uk',
      'user123@sub.domain.com',
    ];

    for (const email of validEmails) {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'not-an-email',
      '@missing-local.com',
      'missing-at-sign.com',
      'spaces in@email.com',
      'user@',
    ];

    for (const email of invalidEmails) {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    }
  });

  it('should reject empty string', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject email longer than 255 characters', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = emailSchema.safeParse(longEmail);
    expect(result.success).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(emailSchema.safeParse(123).success).toBe(false);
    expect(emailSchema.safeParse(null).success).toBe(false);
    expect(emailSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('should validate password with 8 or more characters', () => {
    const validPasswords = ['password', '12345678', 'securepassword123!', 'a'.repeat(100)];

    for (const password of validPasswords) {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    }
  });

  it('should reject password shorter than 8 characters', () => {
    const shortPasswords = ['', 'a', '1234567', 'short'];

    for (const password of shortPasswords) {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
    }
  });

  it('should accept exactly 8 characters', () => {
    const result = passwordSchema.safeParse('12345678');
    expect(result.success).toBe(true);
  });

  it('should reject non-string values', () => {
    expect(passwordSchema.safeParse(12345678).success).toBe(false);
    expect(passwordSchema.safeParse(null).success).toBe(false);
  });
});

describe('uuidSchema', () => {
  it('should validate correct UUIDs', () => {
    const validUuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    for (const uuid of validUuids) {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid UUIDs', () => {
    const invalidUuids = [
      'not-a-uuid',
      '550e8400-e29b-41d4-a716',
      '550e8400e29b41d4a716446655440000',
      '',
      '550e8400-e29b-41d4-a716-44665544000g',
    ];

    for (const uuid of invalidUuids) {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(false);
    }
  });
});

describe('nameSchema', () => {
  it('should validate name with 2 or more characters', () => {
    const validNames = ['Jo', 'John', 'John Doe', 'A'.repeat(50)];

    for (const name of validNames) {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(true);
    }
  });

  it('should reject name shorter than 2 characters', () => {
    const result = nameSchema.safeParse('A');
    expect(result.success).toBe(false);
  });

  it('should accept undefined (optional field)', () => {
    const result = nameSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('should reject empty string', () => {
    const result = nameSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('requiredNameSchema', () => {
  it('should validate name with 2 or more characters', () => {
    const validNames = ['Jo', 'John', 'Jane Doe'];

    for (const name of validNames) {
      const result = requiredNameSchema.safeParse(name);
      expect(result.success).toBe(true);
    }
  });

  it('should reject undefined (required field)', () => {
    const result = requiredNameSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it('should reject name shorter than 2 characters', () => {
    const result = requiredNameSchema.safeParse('A');
    expect(result.success).toBe(false);
  });
});

describe('errorResponseSchema', () => {
  it('should validate error with message only', () => {
    const validError = {
      message: 'Something went wrong',
    };
    const result = errorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Something went wrong');
      expect(result.data.code).toBeUndefined();
      expect(result.data.details).toBeUndefined();
    }
  });

  it('should validate error with message and code', () => {
    const validError = {
      message: 'Not found',
      code: 'NOT_FOUND',
    };
    const result = errorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('NOT_FOUND');
    }
  });

  it('should validate error with all fields', () => {
    const validError = {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: {
        field: 'email',
        reason: 'Invalid format',
      },
    };
    const result = errorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toEqual({
        field: 'email',
        reason: 'Invalid format',
      });
    }
  });

  it('should reject missing message', () => {
    const invalidError = {
      code: 'ERROR',
    };
    const result = errorResponseSchema.safeParse(invalidError);
    expect(result.success).toBe(false);
  });

  it('should allow details with various value types', () => {
    const validError = {
      message: 'Complex error',
      details: {
        count: 5,
        flag: true,
        nested: { key: 'value' },
        items: [1, 2, 3],
      },
    };
    const result = errorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });
});
