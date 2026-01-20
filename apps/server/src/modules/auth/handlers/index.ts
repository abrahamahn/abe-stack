// apps/server/src/modules/auth/handlers/index.ts
/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

export { handleLogin } from './login';
export { handleRegister, type RegisterResult } from './register';
export { handleRefresh } from './refresh';
export { handleLogout } from './logout';
export { handleLogoutAll } from './logout-all';
export { handleForgotPassword, handleResetPassword } from './password';
export { handleVerifyEmail, handleResendVerification } from './verify';
