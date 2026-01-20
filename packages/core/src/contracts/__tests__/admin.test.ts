// packages/core/src/contracts/__tests__/admin.test.ts
import { describe, expect, it } from 'vitest';

import { adminContract, unlockAccountRequestSchema, unlockAccountResponseSchema } from '../admin';

describe('unlockAccountRequestSchema', () => {
  it('should validate correct request data', () => {
    const validData = {
      email: 'user@example.com',
    };
    const result = unlockAccountRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject missing email', () => {
    const invalidData = {};
    const result = unlockAccountRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
    };
    const result = unlockAccountRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty email string', () => {
    const invalidData = {
      email: '',
    };
    const result = unlockAccountRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('unlockAccountResponseSchema', () => {
  it('should validate correct response data', () => {
    const validData = {
      message: 'Account unlocked successfully',
      email: 'user@example.com',
    };
    const result = unlockAccountResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Account unlocked successfully');
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject missing message', () => {
    const invalidData = {
      email: 'user@example.com',
    };
    const result = unlockAccountResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const invalidData = {
      message: 'Account unlocked',
    };
    const result = unlockAccountResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email in response', () => {
    const invalidData = {
      message: 'Account unlocked',
      email: 'invalid-email',
    };
    const result = unlockAccountResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('adminContract', () => {
  it('should have unlockAccount endpoint defined', () => {
    expect(adminContract.unlockAccount).toBeDefined();
    expect(adminContract.unlockAccount.method).toBe('POST');
    expect(adminContract.unlockAccount.path).toBe('/api/admin/auth/unlock');
  });

  it('should have correct response codes defined', () => {
    const responses = adminContract.unlockAccount.responses;
    expect(responses[200]).toBeDefined();
    expect(responses[401]).toBeDefined();
    expect(responses[403]).toBeDefined();
    expect(responses[404]).toBeDefined();
  });
});
