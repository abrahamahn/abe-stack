// main/shared/src/core/users/users.schemas.test.ts

/**
 * @file Unit Tests for User Schemas
 * @description Tests for user profile, password, avatar, and session validation schemas.
 * @module Core/Users/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  avatarDeleteResponseSchema,
  avatarUploadRequestSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userSchema,
} from './users.schemas';

import type {
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Session,
  SessionsListResponse,
  UpdateProfileRequest,
  User,
} from './users.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_ISO = '2026-01-01T00:00:00.000Z';

const VALID_USER = {
  id: VALID_UUID,
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  role: 'user',
  emailVerified: true,
  phone: null,
  phoneVerified: null,
  dateOfBirth: null,
  gender: null,
  createdAt: VALID_ISO,
  updatedAt: VALID_ISO,
};

const VALID_SESSION = {
  id: VALID_UUID,
  createdAt: VALID_ISO,
  expiresAt: '2026-02-01T00:00:00.000Z',
  lastUsedAt: VALID_ISO,
  device: 'Chrome on macOS',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  isCurrent: true,
};

// ============================================================================
// userSchema
// ============================================================================

describe('userSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full user', () => {
      const result: User = userSchema.parse(VALID_USER);

      expect(result.id).toBe(VALID_UUID);
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.avatarUrl).toBeNull();
      expect(result.role).toBe('user');
      expect(result.emailVerified).toBe(true);
      expect(result.phone).toBeNull();
      expect(result.phoneVerified).toBeNull();
      expect(result.dateOfBirth).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.createdAt).toBe(VALID_ISO);
      expect(result.updatedAt).toBe(VALID_ISO);
    });

    it('should accept admin role', () => {
      const result: User = userSchema.parse({ ...VALID_USER, role: 'admin' });
      expect(result.role).toBe('admin');
    });

    it('should normalize email to lowercase', () => {
      const result: User = userSchema.parse({ ...VALID_USER, email: 'TEST@EXAMPLE.COM' });
      expect(result.email).toBe('test@example.com');
    });

    it('should accept null for nullable fields', () => {
      const result: User = userSchema.parse({
        ...VALID_USER,
        avatarUrl: null,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
      });
      expect(result.avatarUrl).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.phoneVerified).toBeNull();
      expect(result.dateOfBirth).toBeNull();
      expect(result.gender).toBeNull();
    });

    it('should accept valid avatarUrl', () => {
      const result: User = userSchema.parse({
        ...VALID_USER,
        avatarUrl: 'https://cdn.example.com/avatar.png',
      });
      expect(result.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => userSchema.parse({ ...VALID_USER, id: 'bad-id' })).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() => userSchema.parse({ ...VALID_USER, email: 'not-email' })).toThrow();
    });

    it('should reject invalid role', () => {
      expect(() => userSchema.parse({ ...VALID_USER, role: 'superadmin' })).toThrow();
    });

    it('should reject non-boolean emailVerified', () => {
      expect(() => userSchema.parse({ ...VALID_USER, emailVerified: 'yes' })).toThrow();
    });

    it('should reject invalid createdAt', () => {
      expect(() => userSchema.parse({ ...VALID_USER, createdAt: 'not-a-date' })).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => userSchema.parse(null)).toThrow();
      expect(() => userSchema.parse('string')).toThrow();
      expect(() => userSchema.parse(42)).toThrow();
    });

    it('should reject invalid avatarUrl format', () => {
      expect(() => userSchema.parse({ ...VALID_USER, avatarUrl: 'not-a-url' })).toThrow();
    });
  });
});

// ============================================================================
// updateProfileRequestSchema
// ============================================================================

describe('updateProfileRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with firstName only', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({ firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
      expect(result.email).toBeUndefined();
    });

    it('should parse with email only', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({
        email: 'new@example.com',
      });
      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBeUndefined();
    });

    it('should parse with multiple fields', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'new@example.com',
      });
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('new@example.com');
    });

    it('should accept null for nullable fields', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({
        phone: null,
        dateOfBirth: null,
        gender: null,
      });
      expect(result.phone).toBeNull();
      expect(result.dateOfBirth).toBeNull();
      expect(result.gender).toBeNull();
    });

    it('should accept empty object (no changes)', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({});
      expect(result.firstName).toBeUndefined();
      expect(result.email).toBeUndefined();
    });
  });

  describe('firstName validation', () => {
    it('should accept firstName with 1 character', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({ firstName: 'A' });
      expect(result.firstName).toBe('A');
    });

    it('should reject firstName longer than 100 characters', () => {
      expect(() => updateProfileRequestSchema.parse({ firstName: 'A'.repeat(101) })).toThrow();
    });

    it('should accept firstName with exactly 100 characters', () => {
      const firstName = 'A'.repeat(100);
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({ firstName });
      expect(result.firstName).toBe(firstName);
    });
  });

  describe('email validation', () => {
    it('should reject invalid email', () => {
      expect(() => updateProfileRequestSchema.parse({ email: 'bad-email' })).toThrow();
    });

    it('should normalize email', () => {
      const result: UpdateProfileRequest = updateProfileRequestSchema.parse({
        email: ' TEST@Example.COM ',
      });
      expect(result.email).toBe('test@example.com');
    });
  });
});

// ============================================================================
// changePasswordRequestSchema
// ============================================================================

describe('changePasswordRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid change password request', () => {
      const result: ChangePasswordRequest = changePasswordRequestSchema.parse({
        currentPassword: 'oldpass123',
        newPassword: 'newpass1234',
      });
      expect(result.currentPassword).toBe('oldpass123');
      expect(result.newPassword).toBe('newpass1234');
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty currentPassword', () => {
      expect(() =>
        changePasswordRequestSchema.parse({ currentPassword: '', newPassword: 'newpass1234' }),
      ).toThrow();
    });

    it('should reject newPassword shorter than 8 characters', () => {
      expect(() =>
        changePasswordRequestSchema.parse({ currentPassword: 'oldpass', newPassword: 'short' }),
      ).toThrow();
    });

    it('should reject missing fields', () => {
      expect(() => changePasswordRequestSchema.parse({})).toThrow();
      expect(() => changePasswordRequestSchema.parse({ currentPassword: 'old' })).toThrow();
    });

    it('should reject non-string values', () => {
      expect(() =>
        changePasswordRequestSchema.parse({ currentPassword: 123, newPassword: 'newpass1234' }),
      ).toThrow();
    });
  });
});

// ============================================================================
// changePasswordResponseSchema
// ============================================================================

describe('changePasswordResponseSchema', () => {
  it('should parse valid response', () => {
    const result: ChangePasswordResponse = changePasswordResponseSchema.parse({
      success: true,
      message: 'Password changed',
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Password changed');
  });

  it('should reject missing fields', () => {
    expect(() => changePasswordResponseSchema.parse({ success: true })).toThrow();
    expect(() => changePasswordResponseSchema.parse({ message: 'ok' })).toThrow();
  });

  it('should reject non-boolean success', () => {
    expect(() => changePasswordResponseSchema.parse({ success: 'yes', message: 'ok' })).toThrow();
  });
});

// ============================================================================
// avatarUploadResponseSchema
// ============================================================================

describe('avatarUploadResponseSchema', () => {
  it('should parse valid avatar upload response', () => {
    const result: AvatarUploadResponse = avatarUploadResponseSchema.parse({
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });
    expect(result.avatarUrl).toBe('https://cdn.example.com/avatar.png');
  });

  it('should reject missing avatarUrl', () => {
    expect(() => avatarUploadResponseSchema.parse({})).toThrow();
  });

  it('should reject non-string avatarUrl', () => {
    expect(() => avatarUploadResponseSchema.parse({ avatarUrl: 123 })).toThrow();
  });
});

// ============================================================================
// avatarUploadRequestSchema
// ============================================================================

describe('avatarUploadRequestSchema', () => {
  it('should parse a valid avatar upload request', () => {
    const buffer = Uint8Array.from([1, 2, 3]);
    const result = avatarUploadRequestSchema.parse({
      buffer,
      mimetype: 'image/png',
      size: 3,
    });

    expect(result.buffer).toBe(buffer);
    expect(result.mimetype).toBe('image/png');
    expect(result.size).toBe(3);
  });

  it('should reject missing buffer', () => {
    expect(() => avatarUploadRequestSchema.parse({ mimetype: 'image/png' })).toThrow(
      'buffer must be a Uint8Array',
    );
  });
});

// ============================================================================
// avatarDeleteResponseSchema
// ============================================================================

describe('avatarDeleteResponseSchema', () => {
  it('should parse valid avatar delete response', () => {
    const result: AvatarDeleteResponse = avatarDeleteResponseSchema.parse({ success: true });
    expect(result.success).toBe(true);
  });

  it('should reject non-boolean success', () => {
    expect(() => avatarDeleteResponseSchema.parse({ success: 'true' })).toThrow();
  });

  it('should reject missing success', () => {
    expect(() => avatarDeleteResponseSchema.parse({})).toThrow();
  });
});

// ============================================================================
// sessionSchema
// ============================================================================

describe('sessionSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full session', () => {
      const result: Session = sessionSchema.parse(VALID_SESSION);

      expect(result.id).toBe(VALID_UUID);
      expect(result.createdAt).toBe(VALID_ISO);
      expect(result.expiresAt).toBe('2026-02-01T00:00:00.000Z');
      expect(result.lastUsedAt).toBe(VALID_ISO);
      expect(result.device).toBe('Chrome on macOS');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.isCurrent).toBe(true);
    });

    it('should accept null for nullable fields', () => {
      const result: Session = sessionSchema.parse({
        ...VALID_SESSION,
        device: null,
        ipAddress: null,
        userAgent: null,
      });
      expect(result.device).toBeNull();
      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => sessionSchema.parse({ ...VALID_SESSION, id: 'bad' })).toThrow();
    });

    it('should reject non-boolean isCurrent', () => {
      expect(() => sessionSchema.parse({ ...VALID_SESSION, isCurrent: 'yes' })).toThrow();
    });

    it('should reject invalid timestamp', () => {
      expect(() => sessionSchema.parse({ ...VALID_SESSION, createdAt: 'bad-date' })).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => sessionSchema.parse(null)).toThrow();
    });
  });
});

// ============================================================================
// sessionsListResponseSchema
// ============================================================================

describe('sessionsListResponseSchema', () => {
  it('should parse valid sessions list', () => {
    const result: SessionsListResponse = sessionsListResponseSchema.parse({
      sessions: [VALID_SESSION],
    });
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]!.id).toBe(VALID_UUID);
  });

  it('should parse empty sessions array', () => {
    const result: SessionsListResponse = sessionsListResponseSchema.parse({ sessions: [] });
    expect(result.sessions).toHaveLength(0);
  });

  it('should reject non-array sessions', () => {
    expect(() => sessionsListResponseSchema.parse({ sessions: 'not-array' })).toThrow(
      'sessions must be an array',
    );
  });

  it('should reject missing sessions field', () => {
    expect(() => sessionsListResponseSchema.parse({})).toThrow('sessions must be an array');
  });

  it('should reject invalid session items', () => {
    expect(() => sessionsListResponseSchema.parse({ sessions: [{ id: 'bad' }] })).toThrow();
  });
});

// ============================================================================
// revokeSessionResponseSchema
// ============================================================================

describe('revokeSessionResponseSchema', () => {
  it('should parse valid revoke response', () => {
    const result: RevokeSessionResponse = revokeSessionResponseSchema.parse({ success: true });
    expect(result.success).toBe(true);
  });

  it('should reject non-boolean success', () => {
    expect(() => revokeSessionResponseSchema.parse({ success: 1 })).toThrow();
  });
});

// ============================================================================
// revokeAllSessionsResponseSchema
// ============================================================================

describe('revokeAllSessionsResponseSchema', () => {
  it('should parse valid revoke-all response', () => {
    const result: RevokeAllSessionsResponse = revokeAllSessionsResponseSchema.parse({
      success: true,
      revokedCount: 5,
    });
    expect(result.success).toBe(true);
    expect(result.revokedCount).toBe(5);
  });

  it('should reject non-number revokedCount', () => {
    expect(() =>
      revokeAllSessionsResponseSchema.parse({ success: true, revokedCount: 'five' }),
    ).toThrow();
  });

  it('should reject missing revokedCount', () => {
    expect(() => revokeAllSessionsResponseSchema.parse({ success: true })).toThrow();
  });
});
