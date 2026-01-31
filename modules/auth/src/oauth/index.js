// modules/auth/src/oauth/index.ts
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
export { handleGetConnections, handleOAuthCallbackRequest, handleOAuthInitiate, handleOAuthLink, handleOAuthUnlink, } from './handlers';
// Service
export { createOAuthState, decodeOAuthState, encodeOAuthState, findUserByOAuthProvider, getAuthorizationUrl, getConnectedProviders, getProviderClient, handleOAuthCallback, linkOAuthAccount, unlinkOAuthAccount, } from './service';
// Providers
export { createAppleProvider, createGitHubProvider, createGoogleProvider, extractAppleUserFromIdToken, } from './providers';
//# sourceMappingURL=index.js.map