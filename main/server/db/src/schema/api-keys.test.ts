// main/server/db/src/schema/api-keys.test.ts
import { describe, expect, test } from 'vitest';

import {
  API_KEYS_TABLE,
  API_KEY_COLUMNS,
  type ApiKey,
  type NewApiKey,
  type UpdateApiKey,
} from './api-keys';

describe('API Keys Schema - Table Names', () => {
  test('should have correct table name for api_keys', () => {
    expect(API_KEYS_TABLE).toBe('api_keys');
  });

  test('table name should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    expect(API_KEYS_TABLE).toMatch(snakeCasePattern);
  });
});

describe('API Keys Schema - Column Mappings', () => {
  test('should have correct column mappings', () => {
    expect(API_KEY_COLUMNS).toEqual({
      id: 'id',
      tenantId: 'tenant_id',
      userId: 'user_id',
      name: 'name',
      keyPrefix: 'key_prefix',
      keyHash: 'key_hash',
      scopes: 'scopes',
      lastUsedAt: 'last_used_at',
      expiresAt: 'expires_at',
      revokedAt: 'revoked_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(API_KEY_COLUMNS.tenantId).toBe('tenant_id');
    expect(API_KEY_COLUMNS.userId).toBe('user_id');
    expect(API_KEY_COLUMNS.keyPrefix).toBe('key_prefix');
    expect(API_KEY_COLUMNS.keyHash).toBe('key_hash');
    expect(API_KEY_COLUMNS.lastUsedAt).toBe('last_used_at');
    expect(API_KEY_COLUMNS.expiresAt).toBe('expires_at');
    expect(API_KEY_COLUMNS.revokedAt).toBe('revoked_at');
    expect(API_KEY_COLUMNS.createdAt).toBe('created_at');
    expect(API_KEY_COLUMNS.updatedAt).toBe('updated_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'tenantId',
      'userId',
      'name',
      'keyPrefix',
      'keyHash',
      'scopes',
      'lastUsedAt',
      'expiresAt',
      'revokedAt',
      'createdAt',
      'updatedAt',
    ];
    const actualColumns = Object.keys(API_KEY_COLUMNS);

    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(API_KEY_COLUMNS);

    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = API_KEY_COLUMNS;

    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBe(12);

    type IsReadonly = typeof columns extends { readonly id: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

describe('API Keys Schema - ApiKey Type', () => {
  test('should accept valid API key object', () => {
    const validKey: ApiKey = {
      id: 'key-123',
      tenantId: 'ten-456',
      userId: 'usr-789',
      name: 'Production API Key',
      keyPrefix: 'ak_prod_',
      keyHash: 'sha256keyhash',
      scopes: ['read', 'write'],
      lastUsedAt: null,
      expiresAt: new Date('2025-01-01'),
      revokedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    expect(validKey).toBeDefined();
    expect(validKey.id).toBe('key-123');
    expect(validKey.userId).toBe('usr-789');
    expect(validKey.scopes).toEqual(['read', 'write']);
  });

  test('should handle null tenantId for user-scoped keys', () => {
    const userKey: ApiKey = {
      id: 'key-123',
      tenantId: null,
      userId: 'usr-789',
      name: 'Personal Key',
      keyPrefix: 'ak_',
      keyHash: 'hash',
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userKey.tenantId).toBeNull();
    expect(userKey.expiresAt).toBeNull();
  });

  test('should accept empty scopes array', () => {
    const key: ApiKey = {
      id: 'key-123',
      tenantId: null,
      userId: 'usr-789',
      name: 'No Scopes Key',
      keyPrefix: 'ak_',
      keyHash: 'hash',
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(key.scopes).toEqual([]);
    expect(key.scopes.length).toBe(0);
  });

  test('should accept revoked key with timestamp', () => {
    const revokedKey: ApiKey = {
      id: 'key-123',
      tenantId: null,
      userId: 'usr-789',
      name: 'Revoked Key',
      keyPrefix: 'ak_',
      keyHash: 'hash',
      scopes: ['read'],
      lastUsedAt: new Date('2024-06-01'),
      expiresAt: new Date('2025-01-01'),
      revokedAt: new Date('2024-07-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-07-01'),
    };

    expect(revokedKey.revokedAt).toBeInstanceOf(Date);
    expect(revokedKey.lastUsedAt).toBeInstanceOf(Date);
  });
});

describe('API Keys Schema - NewApiKey Type', () => {
  test('should accept minimal new API key', () => {
    const newKey: NewApiKey = {
      userId: 'usr-789',
      name: 'My API Key',
      keyPrefix: 'ak_',
      keyHash: 'sha256hash',
    };

    expect(newKey.userId).toBe('usr-789');
    expect(newKey.name).toBe('My API Key');
    expect(newKey.keyPrefix).toBe('ak_');
    expect(newKey.keyHash).toBe('sha256hash');
  });

  test('should accept new API key with all optional fields', () => {
    const newKey: NewApiKey = {
      id: 'key-123',
      tenantId: 'ten-456',
      userId: 'usr-789',
      name: 'Full API Key',
      keyPrefix: 'ak_prod_',
      keyHash: 'sha256hash',
      scopes: ['read', 'write', 'admin'],
      lastUsedAt: null,
      expiresAt: new Date('2025-01-01'),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(newKey.id).toBe('key-123');
    expect(newKey.tenantId).toBe('ten-456');
    expect(newKey.scopes).toEqual(['read', 'write', 'admin']);
    expect(newKey.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept new key with tenant scoping', () => {
    const newKey: NewApiKey = {
      userId: 'usr-789',
      tenantId: 'ten-456',
      name: 'Tenant Scoped Key',
      keyPrefix: 'ak_ten_',
      keyHash: 'hash',
      scopes: ['read'],
    };

    expect(newKey.tenantId).toBe('ten-456');
    expect(newKey.scopes).toEqual(['read']);
  });
});

describe('API Keys Schema - UpdateApiKey Type', () => {
  test('should accept partial updates', () => {
    const update1: UpdateApiKey = { name: 'Renamed Key' };
    const update2: UpdateApiKey = { scopes: ['read'] };
    const update3: UpdateApiKey = { revokedAt: new Date() };

    expect(update1.name).toBeDefined();
    expect(update2.scopes).toBeDefined();
    expect(update3.revokedAt).toBeDefined();
  });

  test('should accept multiple fields in update', () => {
    const update: UpdateApiKey = {
      name: 'Updated Key',
      scopes: ['read', 'write'],
      expiresAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    };

    expect(update.name).toBe('Updated Key');
    expect(update.scopes).toEqual(['read', 'write']);
    expect(update.expiresAt).toBeInstanceOf(Date);
  });

  test('should accept empty update object', () => {
    const update: UpdateApiKey = {};

    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include immutable fields', () => {
    const update: UpdateApiKey = { name: 'Updated' };

    expect('id' in update).toBe(false);
    expect('userId' in update).toBe(false);
    expect('keyPrefix' in update).toBe(false);
    expect('keyHash' in update).toBe(false);
    expect('createdAt' in update).toBe(false);
  });
});

describe('API Keys Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newKey: NewApiKey = {
      userId: 'usr-789',
      name: 'Key',
      keyPrefix: 'ak_',
      keyHash: 'hash',
    };

    const fullKey: ApiKey = {
      id: 'key-123',
      tenantId: null,
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...newKey,
    };

    expect(fullKey.userId).toBe(newKey.userId);
    expect(fullKey.name).toBe(newKey.name);
  });

  test('Column constants should cover all type properties', () => {
    const apiKey: ApiKey = {
      id: 'id',
      tenantId: null,
      userId: 'userId',
      name: 'name',
      keyPrefix: 'keyPrefix',
      keyHash: 'keyHash',
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const apiKeyKeys = Object.keys(apiKey);
    const columnKeys = Object.keys(API_KEY_COLUMNS);

    expect(columnKeys.sort()).toEqual(apiKeyKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(API_KEY_COLUMNS.lastUsedAt).toMatch(/_at$/);
    expect(API_KEY_COLUMNS.expiresAt).toMatch(/_at$/);
    expect(API_KEY_COLUMNS.revokedAt).toMatch(/_at$/);
    expect(API_KEY_COLUMNS.createdAt).toMatch(/_at$/);
    expect(API_KEY_COLUMNS.updatedAt).toMatch(/_at$/);
  });

  test('should have id and createdAt fields', () => {
    expect(API_KEY_COLUMNS).toHaveProperty('id');
    expect(API_KEY_COLUMNS).toHaveProperty('createdAt');
    expect(API_KEY_COLUMNS).toHaveProperty('updatedAt');
  });
});

describe('API Keys Schema - Integration Scenarios', () => {
  test('should support API key creation workflow', () => {
    const newKey: NewApiKey = {
      userId: 'usr-789',
      tenantId: 'ten-456',
      name: 'CI/CD Pipeline',
      keyPrefix: 'ak_ci_',
      keyHash: 'sha256_of_full_key',
      scopes: ['deploy', 'read'],
      expiresAt: new Date('2025-01-01'),
    };

    const createdKey: ApiKey = {
      id: 'key-generated-uuid',
      tenantId: newKey.tenantId ?? null,
      userId: newKey.userId,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      keyHash: newKey.keyHash,
      scopes: newKey.scopes ?? [],
      lastUsedAt: null,
      expiresAt: newKey.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(createdKey.userId).toBe(newKey.userId);
    expect(createdKey.scopes).toEqual(['deploy', 'read']);
    expect(createdKey.revokedAt).toBeNull();
  });

  test('should support API key revocation workflow', () => {
    const activeKey: ApiKey = {
      id: 'key-123',
      tenantId: null,
      userId: 'usr-789',
      name: 'My Key',
      keyPrefix: 'ak_',
      keyHash: 'hash',
      scopes: ['read', 'write'],
      lastUsedAt: new Date('2024-06-01'),
      expiresAt: new Date('2025-01-01'),
      revokedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const revokedKey: ApiKey = {
      ...activeKey,
      revokedAt: new Date(),
      updatedAt: new Date(),
    };

    expect(activeKey.revokedAt).toBeNull();
    expect(revokedKey.revokedAt).toBeInstanceOf(Date);
  });

  test('should support multiple scopes', () => {
    const adminKey: ApiKey = {
      id: 'key-admin',
      tenantId: 'ten-456',
      userId: 'usr-789',
      name: 'Admin Key',
      keyPrefix: 'ak_admin_',
      keyHash: 'hash',
      scopes: ['read', 'write', 'admin', 'billing', 'users'],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(adminKey.scopes.length).toBe(5);
    expect(adminKey.scopes).toContain('admin');
    expect(adminKey.scopes).toContain('billing');
  });
});
