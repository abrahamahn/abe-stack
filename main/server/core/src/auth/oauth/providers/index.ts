// main/server/core/src/auth/oauth/providers/index.ts
/**
 * OAuth Providers
 *
 * Factory functions for creating OAuth provider clients.
 *
 * @module oauth/providers
 */

export { createGoogleProvider } from './google';
export { createGitHubProvider } from './github';
export { createKakaoProvider } from './kakao';
export { createAppleProvider, extractAppleUserFromIdToken } from './apple';
export type { AppleProviderConfig } from './apple';
