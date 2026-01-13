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
} from './middleware';

// Handlers
export {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  verifyToken,
  type ReplyWithCookies,
  type RequestWithCookies,
} from './handlers';

// Utils (for direct use if needed)
export * from './utils';
