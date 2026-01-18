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
  handleResetPassword,
  handleVerifyEmail,
} from '@auth/handlers';

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
