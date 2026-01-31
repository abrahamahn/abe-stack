/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 *
 * @module handlers
 */
export { handleLogin } from './login';
export { handleRegister, type RegisterResult } from './register';
export { handleRefresh } from './refresh';
export { handleLogout } from './logout';
export { handleLogoutAll } from './logout-all';
export { handleForgotPassword, handleResetPassword, handleSetPassword } from './password';
export { handleVerifyEmail, handleResendVerification } from './verify';
//# sourceMappingURL=index.d.ts.map