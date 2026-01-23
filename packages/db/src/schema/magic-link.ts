// packages/db/src/schema/magic-link.ts
/**
 * Magic Link Schema Types
 *
 * Explicit TypeScript interfaces for magic link authentication.
 */

// ============================================================================
// Table Names
// ============================================================================

export const MAGIC_LINK_TOKENS_TABLE = 'magic_link_tokens';

// ============================================================================
// Magic Link Token Types
// ============================================================================

/**
 * Magic link token record (SELECT result)
 *
 * Security considerations:
 * - Token is hashed (SHA-256) before storage
 * - Short expiry (15 minutes)
 * - Single-use (marked as used after verification)
 */
export interface MagicLinkToken {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Data for creating a new magic link token (INSERT)
 */
export interface NewMagicLinkToken {
  id?: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Column mappings for magic_link_tokens table
 */
export const MAGIC_LINK_TOKEN_COLUMNS = {
  id: 'id',
  email: 'email',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  usedAt: 'used_at',
  createdAt: 'created_at',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
} as const;
