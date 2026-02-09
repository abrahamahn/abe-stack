// src/shared/src/domain/api-keys/api-keys.schemas.ts

/**
 * @file API Keys Domain Schemas
 * @description Schemas for API key validation and type inference.
 * @module Domain/ApiKeys
 */

import {
  coerceDate,
  createArraySchema,
  createSchema,
  parseNullable,
  parseNullableOptional,
  parseOptional,
  parseString,
} from '../../core/schema.utils';
import { apiKeyIdSchema, tenantIdSchema, userIdSchema } from '../../types/ids';

import type { Schema } from '../../core/api';
import type { ApiKeyId, TenantId, UserId } from '../../types/ids';

// ============================================================================
// Helpers
// ============================================================================

/** Schema for validating string arrays (scopes). */
const scopesSchema = createArraySchema<string>((item) => parseString(item, 'scope'));

// ============================================================================
// Types
// ============================================================================

/**
 * Full API key record (matches DB SELECT result).
 *
 * @param id - Unique API key identifier (UUID)
 * @param tenantId - Optional tenant scope
 * @param userId - Owning user
 * @param name - Human-readable name
 * @param keyPrefix - First 8 chars of key for identification
 * @param keyHash - SHA-256 hash of the full key
 * @param scopes - Permission scopes (TEXT[] in DB)
 * @param lastUsedAt - Last usage timestamp
 * @param expiresAt - Expiration timestamp (null = never expires)
 * @param revokedAt - Revocation timestamp (null = active)
 * @param createdAt - Creation timestamp
 * @param updatedAt - Last modification timestamp
 */
export interface ApiKey {
  id: ApiKeyId;
  tenantId: TenantId | null;
  userId: UserId;
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
 * Input for creating a new API key.
 */
export interface CreateApiKey {
  tenantId?: TenantId | null | undefined;
  userId: UserId;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes?: string[] | undefined;
  expiresAt?: Date | null | undefined;
}

/**
 * Input for updating an existing API key.
 */
export interface UpdateApiKey {
  tenantId?: TenantId | null | undefined;
  name?: string | undefined;
  scopes?: string[] | undefined;
  expiresAt?: Date | null | undefined;
  revokedAt?: Date | null | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Full API key schema (matches DB SELECT result).
 */
export const apiKeySchema: Schema<ApiKey> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: apiKeyIdSchema.parse(obj['id']),
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    userId: userIdSchema.parse(obj['userId']),
    name: parseString(obj['name'], 'name'),
    keyPrefix: parseString(obj['keyPrefix'], 'keyPrefix'),
    keyHash: parseString(obj['keyHash'], 'keyHash'),
    scopes: scopesSchema.parse(obj['scopes']),
    lastUsedAt: parseNullable(obj['lastUsedAt'], (v) => coerceDate(v, 'lastUsedAt')),
    expiresAt: parseNullable(obj['expiresAt'], (v) => coerceDate(v, 'expiresAt')),
    revokedAt: parseNullable(obj['revokedAt'], (v) => coerceDate(v, 'revokedAt')),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
    updatedAt: coerceDate(obj['updatedAt'], 'updatedAt'),
  };
});

/**
 * Schema for creating a new API key.
 */
export const createApiKeySchema: Schema<CreateApiKey> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    userId: userIdSchema.parse(obj['userId']),
    name: parseString(obj['name'], 'name'),
    keyPrefix: parseString(obj['keyPrefix'], 'keyPrefix'),
    keyHash: parseString(obj['keyHash'], 'keyHash'),
    scopes: parseOptional(obj['scopes'], (v) => scopesSchema.parse(v)),
    expiresAt: parseNullableOptional(obj['expiresAt'], (v) => coerceDate(v, 'expiresAt')),
  };
});

/**
 * Schema for updating an existing API key.
 */
export const updateApiKeySchema: Schema<UpdateApiKey> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    name: parseOptional(obj['name'], (v) => parseString(v, 'name')),
    scopes: parseOptional(obj['scopes'], (v) => scopesSchema.parse(v)),
    expiresAt: parseNullableOptional(obj['expiresAt'], (v) => coerceDate(v, 'expiresAt')),
    revokedAt: parseNullableOptional(obj['revokedAt'], (v) => coerceDate(v, 'revokedAt')),
  };
});
