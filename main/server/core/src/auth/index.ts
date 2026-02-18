// main/server/core/src/auth/index.ts
/**
 * Auth Package
 *
 * Provides authentication and authorization functionality.
 * Extracted from apps/server for reuse across applications. Lives in packages/core/src/auth/.
 *
 * @module @bslt/auth
 */

// Routes (for auto-registration)
export { authRoutes } from './routes';

// Middleware factories (use these to create guards with your JWT secret)
export {
  assertUserActive,
  createAuthGuard,
  createRequireAuth,
  createRequireRole,
  extractTokenPayload,
  isAdmin
} from './middleware';

// Handlers
export {
  handleAcceptTos,
  handleChangeEmail,
  handleConfirmEmailChange,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleRemovePhone,
  handleResendVerification,
  handleResetPassword,
  handleSendSmsCode,
  handleSetPassword,
  handleSetPhone,
  handleSudoElevate,
  handleTosStatus,
  handleTotpDisable,
  handleTotpEnable,
  handleTotpLoginVerify,
  handleTotpSetup,
  handleTotpStatus,
  handleVerifyEmail,
  handleVerifyPhone,
  handleVerifySmsCode,
  SUDO_TOKEN_HEADER,
  SUDO_TOKEN_TTL_MINUTES,
  verifySudoToken
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
  type RequestMagicLinkResult
} from './magic-link';

// OAuth
export {
  createAppleProvider,
  createGitHubProvider,
  createGoogleProvider, createOAuthState,
  decodeOAuthState,
  encodeOAuthState, extractAppleUserFromIdToken, findUserByOAuthProvider,
  getAuthorizationUrl,
  getConnectedProviders,
  getProviderClient, handleGetConnections, handleOAuthCallback, handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink, linkOAuthAccount, oauthRoutes, refreshExpiringOAuthTokens, unlinkOAuthAccount, type AppleProviderConfig, type OAuthAuthResult,
  type OAuthCallbackResult,
  type OAuthConnectionInfo,
  type OAuthProvider,
  type OAuthProviderClient,
  type OAuthRefreshResult,
  type OAuthState,
  type OAuthTokenResponse,
  type OAuthUserInfo
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
  RequestWithCookies
} from './types';

export {
  createErrorMapperLogger,
  LOGIN_FAILURE_REASON,
  MAX_PROGRESSIVE_DELAY_MS,
  MIN_JWT_SECRET_LENGTH,
  PROGRESSIVE_DELAY_WINDOW_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_BYTES,
  type LoginFailureReason
} from './types';

// Re-export auth messages from shared (admin module imports these via ../auth)
export {
  AUTH_ERROR_MESSAGES as ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES as SUCCESS_MESSAGES
} from '@bslt/shared';

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
  type TotpChallengeResult
} from './service';

// TOTP (2FA)
export {
  disableTotp,
  enableTotp,
  getTotpStatus,
  setupTotp, verifyTotpCode, verifyTotpForLogin,
  type TotpSetupResult, type TotpVerifyResult
} from './totp';

// SMS 2FA
export {
  checkSmsRateLimit,
  getSmsVerificationCode,
  sendSms2faCode, SMS_CODE_EXPIRY_MS,
  SMS_MAX_ATTEMPTS,
  SMS_RATE_LIMIT_DAILY,
  SMS_RATE_LIMIT_HOURLY, verifySms2faCode, type SetPhoneRequest,
  type SmsChallengeRequest,
  type SmsRateLimitResult,
  type SmsVerificationCode,
  type SmsVerifyRequest,
  type VerifyPhoneRequest
} from './sms-2fa';

// WebAuthn
export {
  clearChallengeStore,
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
  webauthnRouteEntries
} from './webauthn';

// WebAuthn Handlers
export {
  handleDeletePasskey,
  handleListPasskeys,
  handleRenamePasskey,
  handleWebauthnLoginOptions,
  handleWebauthnLoginVerify,
  handleWebauthnRegisterOptions,
  handleWebauthnRegisterVerify
} from './handlers';

// Email Change
export {
  confirmEmailChange,
  initiateEmailChange,
  type EmailChangeConfirmResult,
  type EmailChangeResult
} from './email-change';

// ToS Gating
export {
  acceptTos,
  checkTosAcceptance,
  createRequireTosAcceptance,
  type TosAcceptanceStatus
} from './tos-gating';

// Utils (for direct use if needed)
export {
  cleanupExpiredTokens,
  clearRefreshTokenCookie,
  createAccessToken,
  createAuthResponse,
  createRefreshToken,
  createRefreshTokenFamily,
  extractRequestInfo,
  generateBase64UrlToken,
  generateSecureToken, generateUniqueUsername, getRefreshTokenExpiry,
  hashPassword,
  hashToken,
  initDummyHashPool,
  isDummyHashPoolInitialized,
  JwtError,
  needsRehash,
  resetDummyHashPool,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
  setRefreshTokenCookie, splitFullName, verifyPassword,
  verifyPasswordSafe,
  verifyToken, type AuthResponseData,
  type AuthUser,
  type RequestWithClientInfo,
  type TokenPayload
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
  sendEmailChangedAlert,
  sendNewLoginAlert,
  sendPasswordChangedAlert,
  sendTokenReuseAlert,
  unlockAccount
} from './security';

export { createRequireSudo, isCaptchaRequired, verifyCaptchaToken, verifyTurnstileToken } from './security';

export type {
  AuthEndpoint,
  AuthRateLimitConfig,
  CaptchaVerifyResult,
  LockoutConfig,
  LockoutStatus,
  LogSecurityEventParams,
  SecurityEventMetadata,
  SecurityEventSeverity,
  SecurityEventType,
  SendEmailChangedAlertParams,
  SendSecurityAlertParams,
  SendTokenReuseAlertParams
} from './security';

