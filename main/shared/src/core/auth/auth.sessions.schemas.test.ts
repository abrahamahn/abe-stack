// main/shared/src/core/auth/auth.sessions.schemas.test.ts
/**
 * @file Auth Session Schemas Tests
 * @description Tests for user session validation schemas.
 * @module Core/Auth/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  createUserSessionSchema,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from './auth.sessions.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '12345678-1234-4abc-8abc-123456789001';
const VALID_UUID_2 = '12345678-1234-4abc-8abc-123456789002';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_SESSION = {
  id: VALID_UUID,
  userId: VALID_UUID_2,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  deviceId: 'device-abc',
  deviceName: null,
  deviceType: null,
  lastActiveAt: VALID_ISO,
  revokedAt: null,
  createdAt: VALID_ISO,
};

// ============================================================================
// userSessionSchema
// ============================================================================

describe('userSessionSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full session', () => {
      const result: UserSession = userSessionSchema.parse(VALID_SESSION);

      expect(result.id).toBe(VALID_UUID);
      expect(result.userId).toBe(VALID_UUID_2);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.deviceId).toBe('device-abc');
      expect(result.lastActiveAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: UserSession = userSessionSchema.parse({
        ...VALID_SESSION,
        ipAddress: null,
        userAgent: null,
        deviceId: null,
        deviceName: null,
        deviceType: null,
        revokedAt: null,
      });

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
      expect(result.deviceId).toBeNull();
      expect(result.deviceName).toBeNull();
      expect(result.deviceType).toBeNull();
      expect(result.revokedAt).toBeNull();
    });

    it('should parse deviceName and deviceType when provided', () => {
      const result: UserSession = userSessionSchema.parse({
        ...VALID_SESSION,
        deviceName: 'iPhone 15 Pro',
        deviceType: 'mobile',
      });

      expect(result.deviceName).toBe('iPhone 15 Pro');
      expect(result.deviceType).toBe('mobile');
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: UserSession = userSessionSchema.parse(VALID_SESSION);

      expect(result.lastActiveAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: UserSession = userSessionSchema.parse({
        ...VALID_SESSION,
        lastActiveAt: VALID_DATE,
        createdAt: VALID_DATE,
      });

      expect(result.lastActiveAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept a revokedAt date when session is revoked', () => {
      const result: UserSession = userSessionSchema.parse({
        ...VALID_SESSION,
        revokedAt: VALID_ISO,
      });

      expect(result.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => userSessionSchema.parse({ ...VALID_SESSION, id: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() => userSessionSchema.parse({ ...VALID_SESSION, userId: 'bad' })).toThrow();
    });

    it('should reject invalid date for lastActiveAt', () => {
      expect(() =>
        userSessionSchema.parse({ ...VALID_SESSION, lastActiveAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject invalid date for createdAt', () => {
      expect(() =>
        userSessionSchema.parse({ ...VALID_SESSION, createdAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => userSessionSchema.parse(null)).toThrow();
      expect(() => userSessionSchema.parse('string')).toThrow();
      expect(() => userSessionSchema.parse(42)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => userSessionSchema.parse({})).toThrow();
      expect(() => userSessionSchema.parse({ id: VALID_UUID })).toThrow();
    });
  });
});

// ============================================================================
// createUserSessionSchema
// ============================================================================

describe('createUserSessionSchema', () => {
  describe('valid inputs', () => {
    it('should parse with userId only (minimal)', () => {
      const result: CreateUserSession = createUserSessionSchema.parse({
        userId: VALID_UUID,
      });

      expect(result.userId).toBe(VALID_UUID);
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.deviceId).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateUserSession = createUserSessionSchema.parse({
        userId: VALID_UUID,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120',
        deviceId: 'dev-123',
      });

      expect(result.userId).toBe(VALID_UUID);
      expect(result.ipAddress).toBe('10.0.0.1');
      expect(result.userAgent).toBe('Chrome/120');
      expect(result.deviceId).toBe('dev-123');
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateUserSession = createUserSessionSchema.parse({
        userId: VALID_UUID,
        ipAddress: null,
        userAgent: null,
        deviceId: null,
      });

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
      expect(result.deviceId).toBeNull();
    });

    it('should parse deviceName and deviceType when provided', () => {
      const result: CreateUserSession = createUserSessionSchema.parse({
        userId: VALID_UUID,
        deviceName: 'MacBook Pro',
        deviceType: 'desktop',
      });

      expect(result.deviceName).toBe('MacBook Pro');
      expect(result.deviceType).toBe('desktop');
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing userId', () => {
      expect(() => createUserSessionSchema.parse({})).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() => createUserSessionSchema.parse({ userId: 'bad-uuid' })).toThrow();
    });

    it('should reject non-string ipAddress', () => {
      expect(() => createUserSessionSchema.parse({ userId: VALID_UUID, ipAddress: 123 })).toThrow();
    });
  });
});

// ============================================================================
// updateUserSessionSchema
// ============================================================================

describe('updateUserSessionSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty update (no changes)', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({});

      expect(result.lastActiveAt).toBeUndefined();
      expect(result.revokedAt).toBeUndefined();
    });

    it('should parse with lastActiveAt only', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        lastActiveAt: VALID_ISO,
      });

      expect(result.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should parse with lastActiveAt as Date object', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        lastActiveAt: VALID_DATE,
      });

      expect(result.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should parse with revokedAt (revoke session)', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        revokedAt: VALID_ISO,
      });

      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('should accept null revokedAt (un-revoke)', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        revokedAt: null,
      });

      expect(result.revokedAt).toBeNull();
    });

    it('should parse with both fields', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        lastActiveAt: VALID_ISO,
        revokedAt: VALID_ISO,
      });

      expect(result.lastActiveAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('should parse deviceName and deviceType updates', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        deviceName: 'Safari on iPhone',
        deviceType: 'mobile',
      });

      expect(result.deviceName).toBe('Safari on iPhone');
      expect(result.deviceType).toBe('mobile');
    });

    it('should accept null for deviceName and deviceType (clearing device info)', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse({
        deviceName: null,
        deviceType: null,
      });

      expect(result.deviceName).toBeNull();
      expect(result.deviceType).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid date for lastActiveAt', () => {
      expect(() => updateUserSessionSchema.parse({ lastActiveAt: 'bad' })).toThrow();
    });

    it('should reject invalid date for revokedAt', () => {
      expect(() => updateUserSessionSchema.parse({ revokedAt: 'bad' })).toThrow();
    });

    it('should coerce non-object input to empty update', () => {
      const result: UpdateUserSession = updateUserSessionSchema.parse(null);
      expect(result.lastActiveAt).toBeUndefined();
      expect(result.revokedAt).toBeUndefined();
    });
  });
});
