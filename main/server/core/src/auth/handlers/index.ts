// main/server/core/src/auth/handlers/index.ts
/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 *
 * @module handlers
 */

export { handleLogin } from './login';
export { handleRegister } from './register';
export { handleRefresh } from './refresh';
export { handleLogout } from './logout';
export { handleLogoutAll } from './logout-all';
export { handleForgotPassword, handleResetPassword, handleSetPassword } from './password';
export { handleVerifyEmail, handleResendVerification } from './verify';
export {
  handleTotpSetup,
  handleTotpEnable,
  handleTotpDisable,
  handleTotpStatus,
  handleTotpLoginVerify,
} from './totp';
export {
  handleChangeEmail,
  handleConfirmEmailChange,
  handleRevertEmailChange,
} from './email-change';
export { handleSudoElevate, verifySudoToken, SUDO_TOKEN_TTL_MINUTES } from './sudo';
export { SUDO_TOKEN_HEADER } from '@abe-stack/shared';
export { handleAcceptTos, handleTosStatus } from './tos';
export { handleListDevices, handleTrustDevice, handleRevokeDevice } from './devices';
export { handleSetPhone, handleVerifyPhone, handleRemovePhone } from './phone';
export { handleInvalidateSessions } from './invalidate-sessions';
export { handleSendSmsCode, handleVerifySmsCode } from './sms-challenge';
export {
  handleDeletePasskey,
  handleListPasskeys,
  handleRenamePasskey,
  handleWebauthnLoginOptions,
  handleWebauthnLoginVerify,
  handleWebauthnRegisterOptions,
  handleWebauthnRegisterVerify,
} from './webauthn';
