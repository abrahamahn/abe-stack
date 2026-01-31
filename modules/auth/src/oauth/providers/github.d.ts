/**
 * GitHub OAuth Provider
 *
 * Implements OAuth 2.0 for GitHub authentication.
 * Scopes: user:email, read:user (for basic user info and verified email)
 *
 * @module oauth/providers/github
 */
import type { OAuthProviderClient } from '../types';
/**
 * Create a GitHub OAuth provider client.
 *
 * @param clientId - GitHub OAuth client ID
 * @param clientSecret - GitHub OAuth client secret
 * @returns OAuth provider client implementation
 * @complexity O(1)
 */
export declare function createGitHubProvider(clientId: string, clientSecret: string): OAuthProviderClient;
//# sourceMappingURL=github.d.ts.map