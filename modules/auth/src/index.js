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
export { createAuthGuard, createRequireAuth, createRequireRole, extractTokenPayload, isAdmin, } from './middleware';
// Handlers
export { handleForgotPassword, handleLogin, handleLogout, handleLogoutAll, handleRefresh, handleRegister, handleResendVerification, handleResetPassword, handleSetPassword, handleVerifyEmail, } from './handlers';
// Magic Link
export { cleanupExpiredMagicLinkTokens, handleMagicLinkRequest, handleMagicLinkVerify, magicLinkRoutes, requestMagicLink, verifyMagicLink, } from './magic-link';
// OAuth
export { oauthRoutes, handleGetConnections, handleOAuthCallbackRequest, handleOAuthInitiate, handleOAuthLink, handleOAuthUnlink, createOAuthState, decodeOAuthState, encodeOAuthState, findUserByOAuthProvider, getAuthorizationUrl, getConnectedProviders, getProviderClient, handleOAuthCallback, linkOAuthAccount, unlinkOAuthAccount, createAppleProvider, createGitHubProvider, createGoogleProvider, extractAppleUserFromIdToken, } from './oauth';
export { createErrorMapperLogger, ERROR_MESSAGES, MAX_PROGRESSIVE_DELAY_MS, MIN_JWT_SECRET_LENGTH, PROGRESSIVE_DELAY_WINDOW_MS, REFRESH_COOKIE_NAME, REFRESH_TOKEN_BYTES, SUCCESS_MESSAGES, } from './types';
// Service (business logic)
export { authenticateUser, createEmailVerificationToken, hasPassword, logoutUser, refreshUserTokens, registerUser, requestPasswordReset, resendVerificationEmail, resetPassword, setPassword, verifyEmail, } from './service';
// Utils (for direct use if needed)
export { cleanupExpiredTokens, clearRefreshTokenCookie, createAccessToken, createAuthResponse, createRefreshToken, createRefreshTokenFamily, extractRequestInfo, getRefreshTokenExpiry, hashPassword, initDummyHashPool, isDummyHashPoolInitialized, JwtError, needsRehash, resetDummyHashPool, revokeAllUserTokens, revokeTokenFamily, rotateRefreshToken, setRefreshTokenCookie, verifyPassword, verifyPasswordSafe, verifyToken, } from './utils';
// Security (login tracking, lockout, audit)
export { applyProgressiveDelay, AUTH_RATE_LIMITS, authRateLimiters, clearLoginAttempts, createAuthRateLimitHook, getAccountLockoutStatus, getProgressiveDelay, getSecurityEventMetrics, getUserSecurityEvents, isAccountLocked, logAccountLockedEvent, logAccountUnlockedEvent, logLoginAttempt, logMagicLinkFailedEvent, logMagicLinkRequestEvent, logMagicLinkVerifiedEvent, logOAuthLinkFailureEvent, logOAuthLinkSuccessEvent, logOAuthLoginFailureEvent, logOAuthLoginSuccessEvent, logOAuthUnlinkFailureEvent, logOAuthUnlinkSuccessEvent, logSecurityEvent, logTokenFamilyRevokedEvent, logTokenReuseEvent, sendTokenReuseAlert, unlockAccount, } from './security';
// Config
export { AuthValidationError, getRefreshCookieOptions, isStrategyEnabled, loadAuthConfig, loadJwtRotationConfig, loadRateLimitConfig, validateAuthConfig, } from './config';
//# sourceMappingURL=index.js.map