// packages/auth/src/oauth/providers/index.ts
/**
 * OAuth Providers
 *
 * Factory functions for creating OAuth provider clients.
 *
 * @module oauth/providers
 */

export { createGoogleProvider } from './google';
export { createGitHubProvider } from './github';
export { createAppleProvider, extractAppleUserFromIdToken } from './apple';
export type { AppleProviderConfig } from './apple';
