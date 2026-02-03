// modules/auth/src/index.ts
/**
 * Auth Package
 *
 * Provides authentication and authorization functionality.
 * Extracted from apps/server/src/modules/auth for reuse across applications.
 *
 * @module @abe-stack/auth
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
} from './middleware';

// Handlers
export {
  handleChangeEmail,
  handleConfirmEmailChange,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleSetPassword,
  handleTotpDisable,
  handleTotpEnable,
  handleTotpSetup,
  handleTotpStatus,
  handleVerifyEmail,
} from './handlers';

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

// Types (auth module types)
export type {
  AppContext,
  AuthEmailOptions,
  AuthEmailService,
  AuthEmailTemplates,
  AuthLogger,
  AuthModuleDeps,
  EmailTemplateResult,
  ReplyWithCookies,
  RequestWithCookies,
} from './types';

export {
  createErrorMapperLogger,
  ERROR_MESSAGES,
  MAX_PROGRESSIVE_DELAY_MS,
  MIN_JWT_SECRET_LENGTH,
  PROGRESSIVE_DELAY_WINDOW_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_BYTES,
  SUCCESS_MESSAGES,
} from './types';

// Service (business logic)
export {
  authenticateUser,
  createEmailVerificationToken,
  hasPassword,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  setPassword,
  verifyEmail,
  type AuthResult,
  type RefreshResult,
  type RegisterResult,
} from './service';

// TOTP (2FA)
export {
  disableTotp,
  enableTotp,
  getTotpStatus,
  setupTotp,
  verifyTotpForLogin,
  type TotpSetupResult,
  type TotpVerifyResult,
} from './totp';

// Email Change
export {
  confirmEmailChange,
  initiateEmailChange,
  type EmailChangeConfirmResult,
  type EmailChangeResult,
} from './email-change';

// Utils (for direct use if needed)
export {
  cleanupExpiredTokens,
  clearRefreshTokenCookie,
  createAccessToken,
  createAuthResponse,
  createRefreshToken,
  createRefreshTokenFamily,
  extractRequestInfo,
  getRefreshTokenExpiry,
  hashPassword,
  initDummyHashPool,
  isDummyHashPoolInitialized,
  JwtError,
  needsRehash,
  resetDummyHashPool,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
  setRefreshTokenCookie,
  verifyPassword,
  verifyPasswordSafe,
  verifyToken,
  type AuthResponseData,
  type AuthUser,
  type RequestWithClientInfo,
  type TokenPayload,
} from './utils';

// Security (login tracking, lockout, audit)
export {
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

// Config
export {
  AuthValidationError,
  getRefreshCookieOptions,
  isStrategyEnabled,
  loadAuthConfig,
  loadJwtRotationConfig,
  loadRateLimitConfig,
  validateAuthConfig,
} from './config';
