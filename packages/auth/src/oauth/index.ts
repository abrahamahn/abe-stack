// packages/auth/src/oauth/index.ts
/**
 * OAuth Module
 *
 * OAuth authentication for Google, GitHub, and Apple providers.
 *
 * @module oauth
 */

// Routes (for auto-registration)
export { oauthRouteEntries, oauthRoutes } from './routes';

// Handlers
export {
  handleGetConnections,
  handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink,
} from './handlers';

// Service
export {
  createOAuthState,
  decodeOAuthState,
  encodeOAuthState,
  findUserByOAuthProvider,
  getAuthorizationUrl,
  getConnectedProviders,
  getProviderClient,
  handleOAuthCallback,
  linkOAuthAccount,
  unlinkOAuthAccount,
  type OAuthAuthResult,
  type OAuthCallbackResult,
} from './service';

// Providers
export {
  createAppleProvider,
  createGitHubProvider,
  createGoogleProvider,
  extractAppleUserFromIdToken,
  type AppleProviderConfig,
} from './providers';

// Types
export type {
  OAuthConnectionInfo,
  OAuthProvider,
  OAuthProviderClient,
  OAuthState,
  OAuthTokenResponse,
  OAuthUserInfo,
} from './types';
