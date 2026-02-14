// main/server/db/src/repositories/api-keys/api-keys.ts
/**
 * API Keys Repository (Functional)
 *
 * Data access layer for the api_keys table.
 * Provides programmatic API access management.
 *
 * @module
 */

import { and, eq, isNull, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type ApiKey,
  type NewApiKey,
  type UpdateApiKey,
  API_KEY_COLUMNS,
  API_KEYS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// API Key Repository Interface
// ============================================================================

/**
 * Functional repository for API key operations.
 */
export interface ApiKeyRepository {
  /**
   * Create a new API key.
   *
   * @param data - API key data
   * @returns Created API key
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewApiKey): Promise<ApiKey>;

  /**
   * Find an API key by its hash.
   * Used for authentication — looks up the key during API requests.
   *
   * @param keyHash - SHA-256 hash of the full key
   * @returns API key or null if not found
   * @complexity O(1)
   */
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;

  /**
   * Find an API key by ID.
   *
   * @param id - API key ID
   * @returns API key or null if not found
   * @complexity O(1)
   */
  findById(id: string): Promise<ApiKey | null>;

  /**
   * List all API keys for a user.
   *
   * @param userId - User ID
   * @returns Array of API keys (ordered by created_at DESC)
   * @complexity O(n) where n is number of keys
   */
  findByUserId(userId: string): Promise<ApiKey[]>;

  /**
   * List all API keys for a tenant.
   *
   * @param tenantId - Tenant ID
   * @returns Array of API keys (ordered by created_at DESC)
   * @complexity O(n) where n is number of keys
   */
  findByTenantId(tenantId: string): Promise<ApiKey[]>;

  /**
   * Update an API key.
   *
   * @param id - API key ID
   * @param data - Fields to update
   * @returns Updated API key or null if not found
   * @complexity O(1)
   */
  update(id: string, data: UpdateApiKey): Promise<ApiKey | null>;

  /**
   * Revoke an API key by setting revoked_at.
   *
   * @param id - API key ID
   * @returns Revoked API key or null if not found
   * @complexity O(1)
   */
  revoke(id: string): Promise<ApiKey | null>;

  /**
   * Update the last_used_at timestamp for an API key.
   * Called on each successful API authentication.
   *
   * @param id - API key ID
   * @complexity O(1)
   */
  updateLastUsed(id: string): Promise<void>;

  /**
   * Delete an API key permanently.
   *
   * @param id - API key ID
   * @returns True if deleted, false if not found
   * @complexity O(1)
   */
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// API Key Repository Implementation
// ============================================================================

/**
 * Transform raw database row to ApiKey type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed ApiKey object
 * @complexity O(n) where n is number of columns
 */
function transformApiKey(row: Record<string, unknown>): ApiKey {
  return toCamelCase<ApiKey>(row, API_KEY_COLUMNS);
}

/**
 * Create an API key repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns ApiKeyRepository implementation
 */
export function createApiKeyRepository(db: RawDb): ApiKeyRepository {
  return {
    async create(data: NewApiKey): Promise<ApiKey> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, API_KEY_COLUMNS);
      const result = await db.queryOne(
        insert(API_KEYS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create API key');
      }
      return transformApiKey(result);
    },

    async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
      const result = await db.queryOne(
        select(API_KEYS_TABLE)
          .where(and(eq('key_hash', keyHash), isNull('revoked_at')))
          .toSql(),
      );
      return result !== null ? transformApiKey(result) : null;
    },

    async findById(id: string): Promise<ApiKey | null> {
      const result = await db.queryOne(select(API_KEYS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformApiKey(result) : null;
    },

    async findByUserId(userId: string): Promise<ApiKey[]> {
      const rows = await db.query(
        select(API_KEYS_TABLE).where(eq('user_id', userId)).orderBy('created_at', 'desc').toSql(),
      );
      return rows.map(transformApiKey);
    },

    async findByTenantId(tenantId: string): Promise<ApiKey[]> {
      const rows = await db.query(
        select(API_KEYS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return rows.map(transformApiKey);
    },

    async update(id: string, data: UpdateApiKey): Promise<ApiKey | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, API_KEY_COLUMNS);
      const result = await db.queryOne(
        update(API_KEYS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformApiKey(result) : null;
    },

    async revoke(id: string): Promise<ApiKey | null> {
      const result = await db.queryOne(
        update(API_KEYS_TABLE)
          .set({ ['revoked_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformApiKey(result) : null;
    },

    async updateLastUsed(id: string): Promise<void> {
      await db.execute(
        update(API_KEYS_TABLE)
          .set({ ['last_used_at']: new Date() })
          .where(eq('id', id))
          .toSql(),
      );
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(API_KEYS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },
  };
}
