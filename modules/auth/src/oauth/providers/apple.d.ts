/**
 * Apple OAuth Provider (Sign in with Apple)
 *
 * Implements Sign in with Apple OAuth flow.
 * Note: Apple requires additional setup (Apple Developer account, private key).
 *
 * Key differences from other providers:
 * - Uses RS256 JWT for client_secret (generated from private key)
 * - User info is returned in the id_token, not a separate API call
 * - User's name is only returned on first authorization
 *
 * @module oauth/providers/apple
 */
import type { OAuthProviderClient, OAuthUserInfo } from '../types';
/**
 * Apple provider configuration.
 */
export interface AppleProviderConfig {
    /** Apple Services ID (client_id) */
    clientId: string;
    /** Apple Developer Team ID */
    teamId: string;
    /** Key ID from Apple private key */
    keyId: string;
    /** Private key in PEM format */
    privateKey: string;
}
/**
 * Create an Apple OAuth provider client.
 *
 * @param config - Apple provider configuration
 * @returns OAuth provider client implementation
 * @complexity O(1)
 */
export declare function createAppleProvider(config: AppleProviderConfig): OAuthProviderClient;
/**
 * Special helper for Apple: verify and extract user info from id_token.
 * Call this during token exchange since Apple includes user info in id_token.
 *
 * @param idToken - The id_token from Apple's token response
 * @param clientId - Your Apple client_id (Services ID) for audience validation
 * @returns User info extracted from the verified token
 * @throws {OAuthError} If token verification fails
 * @complexity O(n) where n is Apple's key count
 */
export declare function extractAppleUserFromIdToken(idToken: string, clientId: string): Promise<OAuthUserInfo>;
/**
 * Clear the Apple public keys cache (useful for testing).
 *
 * @complexity O(1)
 */
export declare function clearAppleKeysCache(): void;
//# sourceMappingURL=apple.d.ts.map