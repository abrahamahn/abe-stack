// backend/db/src/schema/oauth.ts
/**
 * OAuth Schema Types
 *
 * Explicit TypeScript interfaces for OAuth provider connections.
 */

// ============================================================================
// Table Names
// ============================================================================

export const OAUTH_CONNECTIONS_TABLE = 'oauth_connections';

// ============================================================================
// OAuth Provider Types
// ============================================================================

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'google' | 'github' | 'apple';

/**
 * List of supported OAuth providers
 */
export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

// ============================================================================
// OAuth Connection Types
// ============================================================================

/**
 * OAuth connection record (SELECT result)
 * Links external OAuth provider accounts to users.
 */
export interface OAuthConnection {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new OAuth connection (INSERT)
 */
export interface NewOAuthConnection {
  id?: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data for updating an OAuth connection (UPDATE)
 */
export interface UpdateOAuthConnection {
  providerEmail?: string | null;
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Column mappings for oauth_connections table
 */
export const OAUTH_CONNECTION_COLUMNS = {
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
} as const;
