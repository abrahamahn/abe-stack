/**
 * Google OAuth Provider
 *
 * Implements OAuth 2.0 for Google Sign-In.
 * Scopes: email, profile (for basic user info)
 *
 * @module oauth/providers/google
 */
import type { OAuthProviderClient } from '../types';
/**
 * Create a Google OAuth provider client.
 *
 * @param clientId - Google OAuth client ID
 * @param clientSecret - Google OAuth client secret
 * @returns OAuth provider client implementation
 * @complexity O(1)
 */
export declare function createGoogleProvider(clientId: string, clientSecret: string): OAuthProviderClient;
//# sourceMappingURL=google.d.ts.map