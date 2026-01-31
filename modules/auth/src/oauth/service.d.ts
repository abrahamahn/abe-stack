/**
 * OAuth Service
 *
 * Business logic for OAuth authentication flows.
 * Handles provider management, account linking, and user creation.
 *
 * @module oauth/service
 */
import { type DbClient, type OAuthProvider, type Repositories, type UserRole } from '@abe-stack/db';
import type { OAuthConnectionInfo, OAuthProviderClient, OAuthState, OAuthTokenResponse, OAuthUserInfo } from './types';
import type { AuthConfig } from '@abe-stack/core';
/**
 * OAuth authentication result.
 */
export interface OAuthAuthResult {
    /** JWT access token */
    accessToken: string;
    /** Opaque refresh token */
    refreshToken: string;
    /** Authenticated user data */
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: UserRole;
        createdAt: string;
    };
    /** Whether this is a newly created user */
    isNewUser: boolean;
}
/**
 * OAuth callback result.
 */
export interface OAuthCallbackResult {
    /** Authentication result if successful */
    auth?: OAuthAuthResult;
    /** True if this was a link operation */
    isLinking: boolean;
    /** True if account was linked (for link operations) */
    linked?: boolean;
}
/**
 * Create OAuth state for CSRF protection.
 *
 * @param provider - OAuth provider
 * @param redirectUri - Callback URL
 * @param isLinking - Whether this is a link operation
 * @param userId - User ID if linking
 * @returns OAuth state object
 * @complexity O(1)
 */
export declare function createOAuthState(provider: OAuthProvider, redirectUri: string, isLinking: boolean, userId?: string): OAuthState;
/**
 * Encode OAuth state for URL parameter.
 *
 * @param state - OAuth state object
 * @param encryptionKey - Encryption key for state
 * @returns Encrypted state string
 * @complexity O(1)
 */
export declare function encodeOAuthState(state: OAuthState, encryptionKey: string): string;
/**
 * Decode and validate OAuth state.
 *
 * @param encoded - Encrypted state string
 * @param encryptionKey - Encryption key for state
 * @returns Decoded OAuth state
 * @throws {OAuthStateMismatchError} If state is invalid or expired
 * @complexity O(1)
 */
export declare function decodeOAuthState(encoded: string, encryptionKey: string): OAuthState;
/**
 * Get OAuth provider client for the given provider.
 *
 * @param provider - OAuth provider name
 * @param config - Auth configuration
 * @returns OAuth provider client
 * @throws {OAuthError} If provider is not configured or unsupported
 * @complexity O(1)
 */
export declare function getProviderClient(provider: OAuthProvider, config: AuthConfig): OAuthProviderClient;
/**
 * Generate authorization URL for OAuth flow.
 *
 * @param provider - OAuth provider
 * @param config - Auth configuration
 * @param redirectUri - Callback URL
 * @param isLinking - Whether this is a link operation
 * @param userId - User ID if linking
 * @returns URL and encoded state
 * @complexity O(1)
 */
export declare function getAuthorizationUrl(provider: OAuthProvider, config: AuthConfig, redirectUri: string, isLinking: boolean, userId?: string): {
    url: string;
    state: string;
};
/**
 * Handle OAuth callback - exchange code for tokens and authenticate/link user.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param provider - OAuth provider
 * @param code - Authorization code
 * @param state - Encrypted OAuth state
 * @param redirectUri - Callback URL
 * @returns Callback result
 * @throws {OAuthStateMismatchError} If state validation fails
 * @complexity O(1) - constant database operations
 */
export declare function handleOAuthCallback(db: DbClient, repos: Repositories, config: AuthConfig, provider: OAuthProvider, code: string, state: string, redirectUri: string): Promise<OAuthCallbackResult>;
/**
 * Link OAuth account to existing user.
 * Runs validation queries in parallel for performance.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param userId - User ID to link to
 * @param provider - OAuth provider
 * @param userInfo - User info from provider
 * @param tokens - Token response from provider
 * @throws {NotFoundError} If user not found
 * @throws {ConflictError} If provider already linked
 * @complexity O(1) - parallel validation queries
 */
export declare function linkOAuthAccount(_db: DbClient, repos: Repositories, config: AuthConfig, userId: string, provider: OAuthProvider, userInfo: OAuthUserInfo, tokens: OAuthTokenResponse): Promise<void>;
/**
 * Unlink OAuth account from user.
 * Runs validation queries in parallel for performance.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param userId - User ID
 * @param provider - OAuth provider to unlink
 * @throws {NotFoundError} If connection or user not found
 * @throws {ConflictError} If this is the only auth method
 * @complexity O(1) - parallel validation queries
 */
export declare function unlinkOAuthAccount(_db: DbClient, repos: Repositories, userId: string, provider: OAuthProvider): Promise<void>;
/**
 * Get user's connected OAuth providers.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param userId - User ID
 * @returns Array of OAuth connection info
 * @complexity O(n) where n is the number of connections
 */
export declare function getConnectedProviders(_db: DbClient, repos: Repositories, userId: string): Promise<OAuthConnectionInfo[]>;
/**
 * Find user by OAuth provider and provider user ID.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param provider - OAuth provider
 * @param providerUserId - Provider-specific user ID
 * @returns User info or null
 * @complexity O(1)
 */
export declare function findUserByOAuthProvider(_db: DbClient, repos: Repositories, provider: OAuthProvider, providerUserId: string): Promise<{
    userId: string;
    email: string;
} | null>;
//# sourceMappingURL=service.d.ts.map