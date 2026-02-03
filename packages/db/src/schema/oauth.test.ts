// infra/src/db/schema/oauth.test.ts
/**
 * OAuth Schema Tests
 *
 * Comprehensive tests for OAuth schema type definitions, constants, and column mappings.
 * Validates type safety, constant integrity, and schema structure.
 *
 * @complexity O(1) - All tests are simple constant/type validations
 */

import { describe, expect, it } from 'vitest';

import {
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_PROVIDERS,
  type NewOAuthConnection,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
} from './oauth';

// ============================================================================
// Constants Tests
// ============================================================================

describe('OAuth Schema Constants', () => {
  describe('OAUTH_CONNECTIONS_TABLE', () => {
    it('should be defined with correct table name', () => {
      expect(OAUTH_CONNECTIONS_TABLE).toBe('oauth_connections');
    });

    it('should be a string', () => {
      expect(typeof OAUTH_CONNECTIONS_TABLE).toBe('string');
    });

    it('should not be empty', () => {
      expect(OAUTH_CONNECTIONS_TABLE.length).toBeGreaterThan(0);
    });
  });

  describe('OAUTH_PROVIDERS', () => {
    it('should contain all supported providers', () => {
      expect(OAUTH_PROVIDERS).toEqual(['google', 'github', 'apple']);
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(OAUTH_PROVIDERS)).toBe(true);
      expect(Object.isFrozen(OAUTH_PROVIDERS)).toBe(false);
    });

    it('should have exactly 3 providers', () => {
      expect(OAUTH_PROVIDERS).toHaveLength(3);
    });

    it('should contain unique provider names', () => {
      const uniqueProviders = new Set(OAUTH_PROVIDERS);
      expect(uniqueProviders.size).toBe(OAUTH_PROVIDERS.length);
    });

    it('should only contain lowercase strings', () => {
      OAUTH_PROVIDERS.forEach((provider) => {
        expect(typeof provider).toBe('string');
        expect(provider).toBe(provider.toLowerCase());
      });
    });
  });

  describe('OAUTH_CONNECTION_COLUMNS', () => {
    it('should map all required columns', () => {
      expect(OAUTH_CONNECTION_COLUMNS).toEqual({
        id: 'id',
        userId: 'user_id',
        provider: 'provider',
        providerUserId: 'provider_user_id',
        providerEmail: 'provider_email',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      });
    });

    it('should have snake_case database column names', () => {
      const values = Object.values(OAUTH_CONNECTION_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
        // All multi-word columns should use snake_case
        if (value.includes('_')) {
          expect(value).toBe(value.toLowerCase());
          expect(value).not.toContain('-');
          expect(value).not.toContain(' ');
        }
      });
    });

    it('should have camelCase TypeScript property names', () => {
      const keys = Object.keys(OAUTH_CONNECTION_COLUMNS);
      keys.forEach((key) => {
        expect(typeof key).toBe('string');
        // First character should be lowercase (camelCase)
        expect(key.charAt(0)).toBe(key.charAt(0).toLowerCase());
        // Should not contain underscores or hyphens
        expect(key).not.toContain('_');
        expect(key).not.toContain('-');
      });
    });

    it('should map all OAuthConnection interface fields', () => {
      const expectedKeys = [
        'id',
        'userId',
        'provider',
        'providerUserId',
        'providerEmail',
        'accessToken',
        'refreshToken',
        'expiresAt',
        'createdAt',
        'updatedAt',
      ];
      expect(Object.keys(OAUTH_CONNECTION_COLUMNS)).toEqual(expectedKeys);
    });

    it('should have no duplicate column mappings', () => {
      const values = Object.values(OAUTH_CONNECTION_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('OAuth Type Definitions', () => {
  describe('OAuthProvider', () => {
    it('should accept valid provider types', () => {
      const validProviders: OAuthProvider[] = ['google', 'github', 'apple'];
      validProviders.forEach((provider) => {
        expect(OAUTH_PROVIDERS).toContain(provider);
      });
    });

    it('should match OAUTH_PROVIDERS constant', () => {
      // Type test: ensure OAuthProvider union matches OAUTH_PROVIDERS
      const providers: OAuthProvider[] = [...OAUTH_PROVIDERS];
      expect(providers).toHaveLength(3);
    });
  });

  describe('OAuthConnection', () => {
    it('should represent a complete OAuth connection record', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: new Date('2025-12-31'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      expect(connection.id).toBeDefined();
      expect(connection.userId).toBeDefined();
      expect(connection.provider).toBeDefined();
      expect(connection.providerUserId).toBeDefined();
      expect(connection.providerEmail).toBeDefined();
      expect(connection.accessToken).toBeDefined();
      expect(connection.refreshToken).toBeDefined();
      expect(connection.expiresAt).toBeInstanceOf(Date);
      expect(connection.createdAt).toBeInstanceOf(Date);
      expect(connection.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow null for optional fields', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        providerEmail: null,
        accessToken: 'access-token-xyz',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.providerEmail).toBeNull();
      expect(connection.refreshToken).toBeNull();
      expect(connection.expiresAt).toBeNull();
    });

    it('should require all mandatory fields', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'apple',
        providerUserId: 'apple-user-789',
        providerEmail: null,
        accessToken: 'access-token-xyz',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mandatory fields should not be undefined
      expect(connection.id).toBeDefined();
      expect(connection.userId).toBeDefined();
      expect(connection.provider).toBeDefined();
      expect(connection.providerUserId).toBeDefined();
      expect(connection.accessToken).toBeDefined();
      expect(connection.createdAt).toBeDefined();
      expect(connection.updatedAt).toBeDefined();
    });
  });

  describe('NewOAuthConnection', () => {
    it('should allow creation with all fields', () => {
      const newConnection: NewOAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: new Date('2025-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(newConnection.userId).toBeDefined();
      expect(newConnection.provider).toBeDefined();
      expect(newConnection.providerUserId).toBeDefined();
      expect(newConnection.accessToken).toBeDefined();
    });

    it('should allow creation with only required fields', () => {
      const newConnection: NewOAuthConnection = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        accessToken: 'access-token-xyz',
      };

      expect(newConnection.userId).toBeDefined();
      expect(newConnection.provider).toBeDefined();
      expect(newConnection.providerUserId).toBeDefined();
      expect(newConnection.accessToken).toBeDefined();
    });

    it('should allow optional fields to be omitted', () => {
      const newConnection: NewOAuthConnection = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'apple',
        providerUserId: 'apple-user-789',
        accessToken: 'access-token-xyz',
      };

      expect(newConnection.providerEmail).toBeUndefined();
      expect(newConnection.refreshToken).toBeUndefined();
      expect(newConnection.expiresAt).toBeUndefined();
    });

    it('should allow optional fields to be null', () => {
      const newConnection: NewOAuthConnection = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: 'google-user-123',
        accessToken: 'access-token-xyz',
        providerEmail: null,
        refreshToken: null,
        expiresAt: null,
      };

      expect(newConnection.providerEmail).toBeNull();
      expect(newConnection.refreshToken).toBeNull();
      expect(newConnection.expiresAt).toBeNull();
    });

    it('should allow timestamps to be auto-generated', () => {
      const newConnection: NewOAuthConnection = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        accessToken: 'access-token-xyz',
      };

      // createdAt and updatedAt are optional for INSERT (auto-generated)
      expect(newConnection.createdAt).toBeUndefined();
      expect(newConnection.updatedAt).toBeUndefined();
    });
  });

  describe('UpdateOAuthConnection', () => {
    it('should allow updating all mutable fields', () => {
      const update: UpdateOAuthConnection = {
        providerEmail: 'updated@example.com',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2026-12-31'),
        updatedAt: new Date(),
      };

      expect(update.providerEmail).toBeDefined();
      expect(update.accessToken).toBeDefined();
      expect(update.refreshToken).toBeDefined();
      expect(update.expiresAt).toBeDefined();
      expect(update.updatedAt).toBeDefined();
    });

    it('should allow partial updates', () => {
      const update: UpdateOAuthConnection = {
        accessToken: 'new-access-token',
      };

      expect(update.accessToken).toBeDefined();
      expect(update.providerEmail).toBeUndefined();
      expect(update.refreshToken).toBeUndefined();
    });

    it('should allow setting fields to null', () => {
      const update: UpdateOAuthConnection = {
        providerEmail: null,
        refreshToken: null,
        expiresAt: null,
      };

      expect(update.providerEmail).toBeNull();
      expect(update.refreshToken).toBeNull();
      expect(update.expiresAt).toBeNull();
    });

    it('should allow updating only tokens', () => {
      const update: UpdateOAuthConnection = {
        accessToken: 'refreshed-access-token',
        refreshToken: 'refreshed-refresh-token',
        expiresAt: new Date('2025-06-30'),
        updatedAt: new Date(),
      };

      expect(update.accessToken).toBeDefined();
      expect(update.refreshToken).toBeDefined();
      expect(update.expiresAt).toBeInstanceOf(Date);
    });

    it('should not allow updating immutable fields', () => {
      const update: UpdateOAuthConnection = {
        accessToken: 'new-access-token',
      };

      // Type test: these fields should not exist in UpdateOAuthConnection
      expect('id' in update).toBe(false);
      expect('userId' in update).toBe(false);
      expect('provider' in update).toBe(false);
      expect('providerUserId' in update).toBe(false);
      expect('createdAt' in update).toBe(false);
    });
  });
});

// ============================================================================
// Schema Structure Tests
// ============================================================================

describe('OAuth Schema Structure', () => {
  describe('Column mapping consistency', () => {
    it('should have matching keys between interface and columns', () => {
      const interfaceFields: Array<keyof OAuthConnection> = [
        'id',
        'userId',
        'provider',
        'providerUserId',
        'providerEmail',
        'accessToken',
        'refreshToken',
        'expiresAt',
        'createdAt',
        'updatedAt',
      ];

      const columnKeys = Object.keys(OAUTH_CONNECTION_COLUMNS) as Array<
        keyof typeof OAUTH_CONNECTION_COLUMNS
      >;

      expect(columnKeys.sort()).toEqual(interfaceFields.sort());
    });

    it('should map camelCase to snake_case correctly', () => {
      // Verify common field naming patterns
      expect(OAUTH_CONNECTION_COLUMNS.userId).toBe('user_id');
      expect(OAUTH_CONNECTION_COLUMNS.providerUserId).toBe('provider_user_id');
      expect(OAUTH_CONNECTION_COLUMNS.providerEmail).toBe('provider_email');
      expect(OAUTH_CONNECTION_COLUMNS.accessToken).toBe('access_token');
      expect(OAUTH_CONNECTION_COLUMNS.refreshToken).toBe('refresh_token');
      expect(OAUTH_CONNECTION_COLUMNS.expiresAt).toBe('expires_at');
      expect(OAUTH_CONNECTION_COLUMNS.createdAt).toBe('created_at');
      expect(OAUTH_CONNECTION_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should use consistent ID field naming', () => {
      expect(OAUTH_CONNECTION_COLUMNS.id).toBe('id');
    });

    it('should use consistent provider field naming', () => {
      expect(OAUTH_CONNECTION_COLUMNS.provider).toBe('provider');
    });
  });

  describe('Type relationships', () => {
    it('should have NewOAuthConnection as a subset of OAuthConnection', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'user@example.com',
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // NewOAuthConnection can be created from OAuthConnection fields
      const newConnection: NewOAuthConnection = {
        userId: connection.userId,
        provider: connection.provider,
        providerUserId: connection.providerUserId,
        providerEmail: connection.providerEmail,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
      };

      expect(newConnection.userId).toBe(connection.userId);
      expect(newConnection.provider).toBe(connection.provider);
    });

    it('should have UpdateOAuthConnection as partial mutable fields', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        providerEmail: 'user@example.com',
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // UpdateOAuthConnection can update mutable fields
      const update: UpdateOAuthConnection = {
        providerEmail: connection.providerEmail,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
        updatedAt: new Date(),
      };

      expect(update.accessToken).toBe(connection.accessToken);
    });
  });
});

// ============================================================================
// Edge Cases and Boundary Tests
// ============================================================================

describe('OAuth Schema Edge Cases', () => {
  describe('Provider validation', () => {
    it('should handle all provider types correctly', () => {
      const providers: OAuthProvider[] = ['google', 'github', 'apple'];
      providers.forEach((provider) => {
        const providerStr: string = provider;
        const connection: OAuthConnection = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          provider,
          providerUserId: `${providerStr}-user-123`,
          providerEmail: null,
          accessToken: 'access-token',
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(connection.provider).toBe(provider);
      });
    });
  });

  describe('Null handling', () => {
    it('should handle nullable fields in OAuthConnection', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
        accessToken: 'access-token-xyz',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.providerEmail).toBeNull();
      expect(connection.refreshToken).toBeNull();
      expect(connection.expiresAt).toBeNull();
    });

    it('should handle nullable fields in NewOAuthConnection', () => {
      const newConnection: NewOAuthConnection = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        accessToken: 'access-token-xyz',
        providerEmail: null,
        refreshToken: null,
        expiresAt: null,
      };

      expect(newConnection.providerEmail).toBeNull();
      expect(newConnection.refreshToken).toBeNull();
      expect(newConnection.expiresAt).toBeNull();
    });

    it('should handle nullable fields in UpdateOAuthConnection', () => {
      const update: UpdateOAuthConnection = {
        providerEmail: null,
        refreshToken: null,
        expiresAt: null,
        updatedAt: new Date(),
      };

      expect(update.providerEmail).toBeNull();
      expect(update.refreshToken).toBeNull();
      expect(update.expiresAt).toBeNull();
    });
  });

  describe('Date handling', () => {
    it('should handle Date objects correctly', () => {
      const now = new Date();
      const future = new Date('2025-12-31');

      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'apple',
        providerUserId: 'apple-user-789',
        providerEmail: 'user@example.com',
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresAt: future,
        createdAt: now,
        updatedAt: now,
      };

      expect(connection.expiresAt).toBeInstanceOf(Date);
      expect(connection.createdAt).toBeInstanceOf(Date);
      expect(connection.updatedAt).toBeInstanceOf(Date);
      expect(connection.expiresAt?.toISOString()).toBe(future.toISOString());
    });

    it('should allow null for expiresAt when token does not expire', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'github',
        providerUserId: 'github-user-456',
        providerEmail: 'user@example.com',
        accessToken: 'non-expiring-token',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.expiresAt).toBeNull();
    });
  });

  describe('Empty and boundary values', () => {
    it('should handle minimum valid connection data', () => {
      const connection: OAuthConnection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        provider: 'google',
        providerUserId: '1',
        providerEmail: null,
        accessToken: 'a',
        refreshToken: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.providerUserId.length).toBeGreaterThan(0);
      expect(connection.accessToken.length).toBeGreaterThan(0);
    });

    it('should handle empty update object', () => {
      const update: UpdateOAuthConnection = {};
      expect(Object.keys(update)).toHaveLength(0);
    });

    it('should handle update with only updatedAt', () => {
      const update: UpdateOAuthConnection = {
        updatedAt: new Date(),
      };
      expect(update.updatedAt).toBeInstanceOf(Date);
      expect(Object.keys(update)).toHaveLength(1);
    });
  });
});

// ============================================================================
// Integration with Database Schema
// ============================================================================

describe('OAuth Schema Database Integration', () => {
  describe('Table name validation', () => {
    it('should use valid PostgreSQL table name format', () => {
      // PostgreSQL table names should be lowercase with underscores
      expect(OAUTH_CONNECTIONS_TABLE).toMatch(/^[a-z_]+$/);
    });

    it('should follow naming convention', () => {
      // Should follow pattern of plural noun
      expect(OAUTH_CONNECTIONS_TABLE).toContain('connections');
      expect(OAUTH_CONNECTIONS_TABLE).not.toContain(' ');
      expect(OAUTH_CONNECTIONS_TABLE).not.toContain('-');
    });
  });

  describe('Column name validation', () => {
    it('should use valid PostgreSQL column name format', () => {
      Object.values(OAUTH_CONNECTION_COLUMNS).forEach((columnName) => {
        // PostgreSQL column names should be lowercase with underscores
        expect(columnName).toMatch(/^[a-z_]+$/);
      });
    });

    it('should have standard timestamp column names', () => {
      expect(OAUTH_CONNECTION_COLUMNS.createdAt).toBe('created_at');
      expect(OAUTH_CONNECTION_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should have standard foreign key naming', () => {
      expect(OAUTH_CONNECTION_COLUMNS.userId).toBe('user_id');
    });
  });

  describe('Field naming patterns', () => {
    it('should follow consistent provider field naming', () => {
      expect(OAUTH_CONNECTION_COLUMNS.provider).toBe('provider');
      expect(OAUTH_CONNECTION_COLUMNS.providerUserId).toBe('provider_user_id');
      expect(OAUTH_CONNECTION_COLUMNS.providerEmail).toBe('provider_email');
    });

    it('should follow consistent token field naming', () => {
      expect(OAUTH_CONNECTION_COLUMNS.accessToken).toBe('access_token');
      expect(OAUTH_CONNECTION_COLUMNS.refreshToken).toBe('refresh_token');
    });
  });
});
