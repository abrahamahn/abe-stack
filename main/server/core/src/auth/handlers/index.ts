// main/server/core/src/auth/handlers/index.ts
/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 *
 * @module handlers
 */

export { SUDO_TOKEN_HEADER } from '@bslt/shared';
export { handleListDevices, handleRevokeDevice, handleTrustDevice } from './devices';
export {
  handleChangeEmail,
  handleConfirmEmailChange,
  handleRevertEmailChange,
} from './email-change';
export { handleInvalidateSessions } from './invalidate-sessions';
export { handleLogin } from './login';
export { handleLogout } from './logout';
export { handleLogoutAll } from './logout-all';
export { handleForgotPassword, handleResetPassword, handleSetPassword } from './password';
export { handleRemovePhone, handleSetPhone, handleVerifyPhone } from './phone';
export { handleRefresh } from './refresh';
export { handleRegister } from './register';
export { handleSendSmsCode, handleVerifySmsCode } from './sms-challenge';
export { handleSudoElevate, SUDO_TOKEN_TTL_MINUTES, verifySudoToken } from './sudo';
export { handleAcceptTos, handleTosStatus } from './tos';
export {
  handleTotpDisable,
  handleTotpEnable,
  handleTotpLoginVerify,
  handleTotpSetup,
  handleTotpStatus,
} from './totp';
export { handleResendVerification, handleVerifyEmail } from './verify';
export {
  handleDeletePasskey,
  handleListPasskeys,
  handleRenamePasskey,
  handleWebauthnLoginOptions,
  handleWebauthnLoginVerify,
  handleWebauthnRegisterOptions,
  handleWebauthnRegisterVerify,
} from './webauthn';
