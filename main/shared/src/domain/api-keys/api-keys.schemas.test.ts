// main/shared/src/domain/api-keys/api-keys.schemas.test.ts

/**
 * @file Unit Tests for API Keys Domain Schemas
 * @description Tests for API key validation schemas.
 * @module Domain/ApiKeys
 */

import { describe, expect, it } from 'vitest';

import {
  apiKeySchema,
  createApiKeySchema,
  updateApiKeySchema,
  type ApiKey,
  type CreateApiKey,
  type UpdateApiKey,
} from './api-keys.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_UUID_2 = '00000000-0000-0000-0000-000000000002';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_API_KEY = {
  id: VALID_UUID,
  tenantId: VALID_UUID_2,
  userId: VALID_UUID,
  name: 'Production API Key',
  keyPrefix: 'abe_prod',
  keyHash: 'a'.repeat(64), // SHA-256 hash is 64 hex chars
  scopes: ['read:users', 'write:projects'],
  lastUsedAt: VALID_ISO,
  expiresAt: VALID_ISO,
  revokedAt: null,
  createdAt: VALID_ISO,
  updatedAt: VALID_ISO,
};

// ============================================================================
// apiKeySchema
// ============================================================================

describe('apiKeySchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full API key', () => {
      const result: ApiKey = apiKeySchema.parse(VALID_API_KEY);

      expect(result.id).toBe(VALID_UUID);
      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.userId).toBe(VALID_UUID);
      expect(result.name).toBe('Production API Key');
      expect(result.keyPrefix).toBe('abe_prod');
      expect(result.keyHash).toBe('a'.repeat(64));
      expect(result.scopes).toEqual(['read:users', 'write:projects']);
      expect(result.lastUsedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: ApiKey = apiKeySchema.parse({
        ...VALID_API_KEY,
        tenantId: null,
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.lastUsedAt).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.revokedAt).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: ApiKey = apiKeySchema.parse(VALID_API_KEY);

      expect(result.lastUsedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: ApiKey = apiKeySchema.parse({
        ...VALID_API_KEY,
        lastUsedAt: VALID_DATE,
        expiresAt: VALID_DATE,
        createdAt: VALID_DATE,
        updatedAt: VALID_DATE,
      });

      expect(result.lastUsedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept empty scopes array', () => {
      const result: ApiKey = apiKeySchema.parse({
        ...VALID_API_KEY,
        scopes: [],
      });

      expect(result.scopes).toEqual([]);
    });

    it('should accept multiple scopes', () => {
      const result: ApiKey = apiKeySchema.parse({
        ...VALID_API_KEY,
        scopes: ['read:all', 'write:all', 'admin:access'],
      });

      expect(result.scopes).toEqual(['read:all', 'write:all', 'admin:access']);
    });

    it('should accept revoked API key', () => {
      const result: ApiKey = apiKeySchema.parse({
        ...VALID_API_KEY,
        revokedAt: VALID_ISO,
      });

      expect(result.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, id: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, userId: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for tenantId', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, tenantId: 'bad' })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, name: undefined })).toThrow();
    });

    it('should reject missing keyPrefix', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, keyPrefix: undefined })).toThrow();
    });

    it('should reject missing keyHash', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, keyHash: undefined })).toThrow();
    });

    it('should reject non-array scopes', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, scopes: 'not-an-array' })).toThrow();
    });

    it('should reject invalid date for lastUsedAt', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, lastUsedAt: 'not-a-date' })).toThrow();
    });

    it('should reject invalid date for expiresAt', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, expiresAt: 'not-a-date' })).toThrow();
    });

    it('should reject invalid date for revokedAt', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, revokedAt: 'not-a-date' })).toThrow();
    });

    it('should reject invalid date for createdAt', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, createdAt: 'not-a-date' })).toThrow();
    });

    it('should reject invalid date for updatedAt', () => {
      expect(() => apiKeySchema.parse({ ...VALID_API_KEY, updatedAt: 'not-a-date' })).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => apiKeySchema.parse(null)).toThrow();
      expect(() => apiKeySchema.parse('string')).toThrow();
      expect(() => apiKeySchema.parse(42)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => apiKeySchema.parse({})).toThrow();
      expect(() => apiKeySchema.parse({ id: VALID_UUID })).toThrow();
    });
  });
});

// ============================================================================
// createApiKeySchema
// ============================================================================

describe('createApiKeySchema', () => {
  describe('valid inputs', () => {
    it('should parse with required fields only', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        userId: VALID_UUID,
        name: 'Test Key',
        keyPrefix: 'abe_test',
        keyHash: 'b'.repeat(64),
      });

      expect(result.userId).toBe(VALID_UUID);
      expect(result.name).toBe('Test Key');
      expect(result.keyPrefix).toBe('abe_test');
      expect(result.keyHash).toBe('b'.repeat(64));
      expect(result.tenantId).toBeUndefined();
      expect(result.scopes).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        tenantId: VALID_UUID_2,
        userId: VALID_UUID,
        name: 'Full Key',
        keyPrefix: 'abe_full',
        keyHash: 'c'.repeat(64),
        scopes: ['read:all'],
        expiresAt: VALID_ISO,
      });

      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.scopes).toEqual(['read:all']);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        userId: VALID_UUID,
        name: 'Test Key',
        keyPrefix: 'abe_test',
        keyHash: 'b'.repeat(64),
        tenantId: null,
        expiresAt: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.expiresAt).toBeNull();
    });

    it('should accept empty scopes array', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        userId: VALID_UUID,
        name: 'Test Key',
        keyPrefix: 'abe_test',
        keyHash: 'b'.repeat(64),
        scopes: [],
      });

      expect(result.scopes).toEqual([]);
    });

    it('should coerce ISO string to Date for expiresAt', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        userId: VALID_UUID,
        name: 'Test Key',
        keyPrefix: 'abe_test',
        keyHash: 'b'.repeat(64),
        expiresAt: VALID_ISO,
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should accept Date object for expiresAt', () => {
      const result: CreateApiKey = createApiKeySchema.parse({
        userId: VALID_UUID,
        name: 'Test Key',
        keyPrefix: 'abe_test',
        keyHash: 'b'.repeat(64),
        expiresAt: VALID_DATE,
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing userId', () => {
      expect(() =>
        createApiKeySchema.parse({
          name: 'Test Key',
          keyPrefix: 'abe_test',
          keyHash: 'hash',
        }),
      ).toThrow();
    });

    it('should reject missing name', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: VALID_UUID,
          keyPrefix: 'abe_test',
          keyHash: 'hash',
        }),
      ).toThrow();
    });

    it('should reject missing keyPrefix', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: VALID_UUID,
          name: 'Test Key',
          keyHash: 'hash',
        }),
      ).toThrow();
    });

    it('should reject missing keyHash', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: VALID_UUID,
          name: 'Test Key',
          keyPrefix: 'abe_test',
        }),
      ).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: 'bad-uuid',
          name: 'Test Key',
          keyPrefix: 'abe_test',
          keyHash: 'hash',
        }),
      ).toThrow();
    });

    it('should reject non-array scopes', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: VALID_UUID,
          name: 'Test Key',
          keyPrefix: 'abe_test',
          keyHash: 'hash',
          scopes: 'not-an-array',
        }),
      ).toThrow();
    });

    it('should reject invalid date for expiresAt', () => {
      expect(() =>
        createApiKeySchema.parse({
          userId: VALID_UUID,
          name: 'Test Key',
          keyPrefix: 'abe_test',
          keyHash: 'hash',
          expiresAt: 'not-a-date',
        }),
      ).toThrow();
    });
  });
});

// ============================================================================
// updateApiKeySchema
// ============================================================================

describe('updateApiKeySchema', () => {
  describe('valid inputs', () => {
    it('should parse empty update (no changes)', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({});

      expect(result.name).toBeUndefined();
      expect(result.scopes).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(result.revokedAt).toBeUndefined();
    });

    it('should parse with name only', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should parse with scopes only', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        scopes: ['admin:all'],
      });

      expect(result.scopes).toEqual(['admin:all']);
    });

    it('should parse with expiresAt only', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        expiresAt: VALID_ISO,
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should parse with revokedAt (revoke key)', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        revokedAt: VALID_ISO,
      });

      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        tenantId: null,
        expiresAt: null,
        revokedAt: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.revokedAt).toBeNull();
    });

    it('should parse with all fields', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        tenantId: VALID_UUID,
        name: 'Updated Key',
        scopes: ['read:all', 'write:all'],
        expiresAt: VALID_ISO,
        revokedAt: null,
      });

      expect(result.tenantId).toBe(VALID_UUID);
      expect(result.name).toBe('Updated Key');
      expect(result.scopes).toEqual(['read:all', 'write:all']);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeNull();
    });

    it('should accept empty scopes array', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        scopes: [],
      });

      expect(result.scopes).toEqual([]);
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        expiresAt: VALID_ISO,
        revokedAt: VALID_ISO,
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse({
        expiresAt: VALID_DATE,
        revokedAt: VALID_DATE,
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for tenantId', () => {
      expect(() => updateApiKeySchema.parse({ tenantId: 'bad-uuid' })).toThrow();
    });

    it('should reject non-array scopes', () => {
      expect(() => updateApiKeySchema.parse({ scopes: 'not-an-array' })).toThrow();
    });

    it('should reject invalid date for expiresAt', () => {
      expect(() => updateApiKeySchema.parse({ expiresAt: 'not-a-date' })).toThrow();
    });

    it('should reject invalid date for revokedAt', () => {
      expect(() => updateApiKeySchema.parse({ revokedAt: 'not-a-date' })).toThrow();
    });

    it('should coerce non-object input to empty update', () => {
      const result: UpdateApiKey = updateApiKeySchema.parse(null);
      expect(result.name).toBeUndefined();
      expect(result.scopes).toBeUndefined();
    });
  });
});
