// apps/server/src/modules/auth/index.ts
/**
 * Auth Module
 *
 * Provides authentication and authorization functionality.
 */

// Routes (for auto-registration)
export { authRoutes } from './routes';

// Middleware factories (use these to create guards with your JWT secret)
export {
  createAuthGuard,
  createRequireAuth,
  createRequireRole,
  extractTokenPayload,
  isAdmin,
} from '@auth/middleware';

// Handlers
export {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleVerifyEmail,
} from '@auth/handlers';

// Magic Link
export {
  cleanupExpiredMagicLinkTokens,
  handleMagicLinkRequest,
  handleMagicLinkVerify,
  magicLinkRoutes,
  requestMagicLink,
  verifyMagicLink,
  type MagicLinkResult,
  type RequestMagicLinkResult,
} from './magic-link';

// OAuth
export {
  oauthRoutes,
  handleGetConnections,
  handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink,
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
  createAppleProvider,
  createGitHubProvider,
  createGoogleProvider,
  extractAppleUserFromIdToken,
  type AppleProviderConfig,
  type OAuthAuthResult,
  type OAuthCallbackResult,
  type OAuthConnectionInfo,
  type OAuthProvider,
  type OAuthProviderClient,
  type OAuthState,
  type OAuthTokenResponse,
  type OAuthUserInfo,
} from './oauth';

// Types (re-exported from shared)
export type { ReplyWithCookies, RequestWithCookies } from '@shared';

// Service (business logic)
export {
  authenticateUser,
  createEmailVerificationToken,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
  type AuthResult,
  type RefreshResult,
} from '@auth/service';

// Utils (for direct use if needed)
export {
  cleanupExpiredTokens,
  // JWT
  createAccessToken,
  createRefreshToken,
  // Refresh token management
  createRefreshTokenFamily,
  // Request utilities
  extractRequestInfo,
  getRefreshTokenExpiry,
  // Password
  hashPassword,
  JwtError,
  needsRehash,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
  verifyPassword,
  verifyPasswordSafe,
  type TokenPayload,
} from './utils';

// Security (login tracking, lockout, audit)
export {
  // Lockout functions
  applyProgressiveDelay,
  AUTH_RATE_LIMITS,
  authRateLimiters,
  clearLoginAttempts,
  createAuthRateLimitHook,
  getAccountLockoutStatus,
  getProgressiveDelay,
  getSecurityEventMetrics,
  getUserSecurityEvents,
  isAccountLocked,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logLoginAttempt,
  logMagicLinkFailedEvent,
  logMagicLinkRequestEvent,
  logMagicLinkVerifiedEvent,
  logOAuthLinkFailureEvent,
  logOAuthLinkSuccessEvent,
  logOAuthLoginFailureEvent,
  logOAuthLoginSuccessEvent,
  logOAuthUnlinkFailureEvent,
  logOAuthUnlinkSuccessEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  sendTokenReuseAlert,
  unlockAccount,
} from './security';
export type {
  AuthEndpoint,
  AuthRateLimitConfig,
  LockoutConfig,
  LockoutStatus,
  LogSecurityEventParams,
  SecurityEventMetadata,
  SecurityEventSeverity,
  SecurityEventType,
  SendTokenReuseAlertParams,
} from './security';
