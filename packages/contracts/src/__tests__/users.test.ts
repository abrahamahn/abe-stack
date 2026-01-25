// packages/core/src/contracts/__tests__/users.test.ts
import { describe, expect, it } from 'vitest';

import { userRoleSchema, userSchema, usersContract } from '../users';

describe('userRoleSchema', () => {
  it('should validate correct user roles', () => {
    expect(userRoleSchema.safeParse('user').success).toBe(true);
    expect(userRoleSchema.safeParse('admin').success).toBe(true);
    expect(userRoleSchema.safeParse('moderator').success).toBe(true);
  });

  it('should reject invalid roles', () => {
    expect(userRoleSchema.safeParse('superuser').success).toBe(false);
    expect(userRoleSchema.safeParse('guest').success).toBe(false);
    expect(userRoleSchema.safeParse('').success).toBe(false);
    expect(userRoleSchema.safeParse(123).success).toBe(false);
  });
});

describe('userSchema', () => {
  it('should validate correct user data', () => {
    const validUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.role).toBe('user');
    }
  });

  it('should accept null name', () => {
    const userWithNullName = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: null,
      role: 'user',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(userWithNullName);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeNull();
    }
  });

  it('should reject invalid UUID', () => {
    const invalidUser = {
      id: 'not-a-uuid',
      email: 'user@example.com',
      name: 'John',
      role: 'user',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'invalid-email',
      name: 'John',
      role: 'user',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John',
      role: 'superuser',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject missing createdAt', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject invalid datetime format', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
      createdAt: '2024-01-15',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const incompleteUser = {
      email: 'user@example.com',
    };
    const result = userSchema.safeParse(incompleteUser);
    expect(result.success).toBe(false);
  });

  it('should validate admin role', () => {
    const adminUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(adminUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('admin');
    }
  });

  it('should validate moderator role', () => {
    const modUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'mod@example.com',
      name: 'Moderator User',
      role: 'moderator',
      createdAt: '2024-01-15T10:30:00.000Z',
    };
    const result = userSchema.safeParse(modUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('moderator');
    }
  });
});

describe('usersContract', () => {
  it('should have me endpoint defined', () => {
    expect(usersContract.me).toBeDefined();
    expect(usersContract.me.method).toBe('GET');
    expect(usersContract.me.path).toBe('/api/users/me');
  });

  it('should have correct response codes for me endpoint', () => {
    const responses = usersContract.me.responses;
    expect(responses[200]).toBeDefined();
    expect(responses[401]).toBeDefined();
  });

  it('should have summary for me endpoint', () => {
    expect(usersContract.me.summary).toBe('Get current user profile');
  });
});
