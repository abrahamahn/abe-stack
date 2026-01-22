// apps/server/src/modules/auth/handlers.ts
/**
 * Auth Handlers
 *
 * Re-exports all auth handlers from the handlers/ directory.
 * This file maintains backward compatibility with existing imports.
 */

export {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleLogoutAll,
  handleRefresh,
  handleRegister,
  handleResendVerification,
  handleResetPassword,
  handleSetPassword,
  handleVerifyEmail,
  type RegisterResult,
} from './handlers/index';
