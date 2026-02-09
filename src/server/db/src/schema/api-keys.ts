// src/server/db/src/schema/api-keys.ts
/**
 * API Keys Schema Types
 *
 * TypeScript interfaces for the api_keys table.
 * Provides programmatic API access for integrations.
 * Maps to migration 0010_api_keys.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const API_KEYS_TABLE = 'api_keys';

// ============================================================================
// API Key Types
// ============================================================================

/**
 * API key record (SELECT result).
 * Stores hashed API keys with optional tenant scoping.
 *
 * @see 0010_api_keys.sql
 */
export interface ApiKey {
  id: string;
  tenantId: string | null;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new API key (INSERT).
 */
export interface NewApiKey {
  id?: string;
  tenantId?: string | null;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes?: string[];
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing API key (UPDATE).
 * Excludes immutable fields: id, userId, keyPrefix, keyHash, createdAt.
 */
export interface UpdateApiKey {
  tenantId?: string | null;
  name?: string;
  scopes?: string[];
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  updatedAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const API_KEY_COLUMNS = {
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
} as const;
