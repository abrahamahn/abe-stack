// src/server/core/src/api-keys/service.ts
/**
 * API Keys Service
 *
 * Pure business logic for API key operations.
 * No HTTP awareness -- returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import { createHash, randomBytes } from 'node:crypto';

import type { ApiKeyRepository, ApiKey as DbApiKey } from '@abe-stack/db';

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Result of generating a new API key.
 *
 * @param plaintext - Full plaintext key (shown once, never stored)
 * @param prefix - First 8 characters for display identification
 * @param hash - SHA-256 hex hash of the full key (stored in DB)
 */
export interface GeneratedKey {
  readonly plaintext: string;
  readonly prefix: string;
  readonly hash: string;
}

/**
 * Generate a cryptographically random API key.
 *
 * Produces 32 random bytes encoded as a 64-character hex string.
 * The prefix (first 8 chars) identifies the key in UIs, while
 * the full key is hashed with SHA-256 for storage.
 *
 * @returns Generated key with plaintext, prefix, and hash
 * @complexity O(1)
 */
export function generateApiKey(): GeneratedKey {
  const buffer = randomBytes(32);
  const plaintext = buffer.toString('hex');
  const prefix = plaintext.slice(0, 8);
  const hash = createHash('sha256').update(plaintext).digest('hex');

  return { plaintext, prefix, hash };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Parameters for creating a new API key.
 *
 * @param name - Human-readable name for the key
 * @param scopes - Optional permission scopes
 * @param expiresAt - Optional expiration date
 */
export interface CreateApiKeyParams {
  readonly name: string;
  readonly scopes?: string[];
  readonly expiresAt?: Date | null;
}

/**
 * Result of creating a new API key.
 *
 * @param apiKey - The created database record
 * @param plaintext - The full plaintext key (shown to the user exactly once)
 */
export interface CreateApiKeyResult {
  readonly apiKey: DbApiKey;
  readonly plaintext: string;
}

/**
 * Create a new API key for a user.
 *
 * Generates a cryptographically random key, hashes it, and persists
 * the hash and prefix in the database. The plaintext is returned
 * exactly once and never stored.
 *
 * @param repo - API key repository
 * @param userId - User who owns the key
 * @param params - Key creation parameters (name, scopes, expiresAt)
 * @returns The created API key record and the plaintext key
 * @complexity O(1) - key generation + database insert
 */
export async function createApiKey(
  repo: ApiKeyRepository,
  userId: string,
  params: CreateApiKeyParams,
): Promise<CreateApiKeyResult> {
  const { plaintext, prefix, hash } = generateApiKey();

  const data: {
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes?: string[];
    expiresAt?: Date | null;
  } = {
    userId,
    name: params.name,
    keyPrefix: prefix,
    keyHash: hash,
  };

  if (params.scopes !== undefined) {
    data.scopes = params.scopes;
  }

  if (params.expiresAt !== undefined) {
    data.expiresAt = params.expiresAt;
  }

  const apiKey = await repo.create(data);

  return { apiKey, plaintext };
}

/**
 * List all API keys for a user.
 *
 * @param repo - API key repository
 * @param userId - User whose keys to list
 * @returns Array of API key records (ordered by created_at DESC)
 * @complexity O(n) where n is the number of keys
 */
export async function listApiKeys(repo: ApiKeyRepository, userId: string): Promise<DbApiKey[]> {
  return repo.findByUserId(userId);
}

/**
 * Revoke an API key.
 *
 * Validates that the key belongs to the specified user before revoking.
 * A revoked key cannot be used for authentication.
 *
 * @param repo - API key repository
 * @param userId - User requesting revocation (for ownership check)
 * @param keyId - ID of the key to revoke
 * @returns The revoked API key record
 * @throws Error if the key is not found or does not belong to the user
 * @complexity O(1) - database lookup + update
 */
export async function revokeApiKey(
  repo: ApiKeyRepository,
  userId: string,
  keyId: string,
): Promise<DbApiKey> {
  const existing = await repo.findById(keyId);

  if (existing?.userId !== userId) {
    throw new Error('API key not found');
  }

  if (existing.revokedAt !== null) {
    throw new Error('API key is already revoked');
  }

  const revoked = await repo.revoke(keyId);

  if (revoked === null) {
    throw new Error('Failed to revoke API key');
  }

  return revoked;
}

/**
 * Delete an API key permanently.
 *
 * Validates that the key belongs to the specified user before deleting.
 *
 * @param repo - API key repository
 * @param userId - User requesting deletion (for ownership check)
 * @param keyId - ID of the key to delete
 * @returns True if deleted
 * @throws Error if the key is not found or does not belong to the user
 * @complexity O(1)
 */
export async function deleteApiKey(
  repo: ApiKeyRepository,
  userId: string,
  keyId: string,
): Promise<boolean> {
  const existing = await repo.findById(keyId);

  if (existing?.userId !== userId) {
    throw new Error('API key not found');
  }

  return repo.delete(keyId);
}
