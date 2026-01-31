/**
 * OAuth Module
 *
 * OAuth authentication for Google, GitHub, and Apple providers.
 *
 * @module oauth
 */
export { oauthRouteEntries, oauthRoutes } from './routes';
export { handleGetConnections, handleOAuthCallbackRequest, handleOAuthInitiate, handleOAuthLink, handleOAuthUnlink, } from './handlers';
export { createOAuthState, decodeOAuthState, encodeOAuthState, findUserByOAuthProvider, getAuthorizationUrl, getConnectedProviders, getProviderClient, handleOAuthCallback, linkOAuthAccount, unlinkOAuthAccount, type OAuthAuthResult, type OAuthCallbackResult, } from './service';
export { createAppleProvider, createGitHubProvider, createGoogleProvider, extractAppleUserFromIdToken, type AppleProviderConfig, } from './providers';
export type { OAuthConnectionInfo, OAuthProvider, OAuthProviderClient, OAuthState, OAuthTokenResponse, OAuthUserInfo, } from './types';
//# sourceMappingURL=index.d.ts.map