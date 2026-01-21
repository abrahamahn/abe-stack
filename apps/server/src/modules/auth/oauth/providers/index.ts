// apps/server/src/modules/auth/oauth/providers/index.ts
/**
 * OAuth Providers
 *
 * Factory functions for creating OAuth provider clients.
 */

export { createGoogleProvider } from './google';
export { createGitHubProvider } from './github';
export { createAppleProvider, extractAppleUserFromIdToken } from './apple';
export type { AppleProviderConfig } from './apple';
