// apps/server/src/modules/auth/index.ts
/**
 * Auth Module
 *
 * Provides authentication and authorization functionality.
 */

// Middleware factories (use these to create guards with your JWT secret)
export {
  extractTokenPayload,
  createRequireAuth,
  createRequireRole,
  createAuthGuard,
  isAdmin,
} from '@auth/middleware';

// Handlers
export {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  verifyToken,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@auth/handlers';

// Service (business logic)
export {
  authenticateUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
  type AuthResult,
  type RefreshResult,
} from '@auth/service';

// Utils (for direct use if needed)
export {
  // JWT
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  JwtError,
  type TokenPayload,
  // Password
  hashPassword,
  verifyPassword,
  verifyPasswordSafe,
  needsRehash,
  // Refresh token management
  createRefreshTokenFamily,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  // Request utilities
  extractRequestInfo,
} from './utils';
