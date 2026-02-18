// main/shared/src/core/auth/index.ts
/**
 * Auth Module Barrel
 *
 * Central exports for authentication schemas, password validation,
 * error classes, roles, sessions, and policy.
 */

// --- Core auth schemas (login, register, password reset, sudo) ---
export {
  authResponseSchema,
  bffLoginResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  isAuthenticatedRequest,
  loginRequestSchema,
  loginSuccessResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  sudoRequestSchema,
  sudoResponseSchema,
  type AuthResponse,
  type BffLoginResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type LoginRequest,
  type LoginSuccessResponse,
  type LogoutResponse,
  type RefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type SetPasswordRequest,
  type SetPasswordResponse,
  type SudoRequest,
  type SudoResponse,
} from './auth.core.schemas';

// --- Device schemas ---
export {
  deviceItemSchema,
  deviceListResponseSchema,
  trustDeviceResponseSchema,
  type DeviceItem,
  type DeviceListResponse,
  type TrustDeviceResponse,
} from './auth.devices.schemas';

// --- Email schemas ---
export {
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  revertEmailChangeRequestSchema,
  revertEmailChangeResponseSchema,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type ConfirmEmailChangeRequest,
  type ConfirmEmailChangeResponse,
  type EmailVerificationRequest,
  type EmailVerificationResponse,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type RevertEmailChangeRequest,
  type RevertEmailChangeResponse,
} from './auth.email.schemas';

// --- Auth helpers ---
export { getRefreshCookieOptions, isStrategyEnabled } from './auth.helpers.logic';

// --- Magic link schemas ---
export {
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
  type MagicLinkVerifyResponse,
} from './auth.magic.link.schemas';

// --- MFA schemas ---
export {
  invalidateSessionsResponseSchema,
  removePhoneResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
  type InvalidateSessionsResponse,
  type RemovePhoneResponse,
  type SetPhoneRequest,
  type SetPhoneResponse,
  type SmsChallengeRequest,
  type SmsChallengeResponse,
  type SmsLoginChallengeResponse,
  type SmsVerifyRequest,
  type TotpLoginChallengeResponse,
  type TotpLoginVerifyRequest,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
  type VerifyPhoneRequest,
  type VerifyPhoneResponse,
} from './auth.mfa.schemas';

// --- OAuth schemas ---
export {
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthProviderSchema,
  oauthUnlinkResponseSchema,
  type OAuthCallbackQuery,
  type OAuthCallbackResponse,
  type OAuthConnection,
  type OAuthConnectionsResponse,
  type OAuthEnabledProvidersResponse,
  type OAuthInitiateResponse,
  type OAuthLinkCallbackResponse,
  type OAuthLinkResponse,
  type OAuthProvider,
  type OAuthUnlinkResponse,
} from './auth.oauth.schemas';

// --- Passkey schemas ---
export {
  passkeyListResponseSchema,
  renamePasskeyRequestSchema,
  type PasskeyListItem,
  type RenamePasskeyRequest,
} from './auth.passkey.schemas';

// --- ToS schemas ---
export {
  acceptTosRequestSchema,
  acceptTosResponseSchema,
  tosStatusResponseSchema,
  type AcceptTosRequest,
  type AcceptTosResponse,
  type TosStatusResponse,
} from './auth.tos.schemas';

// --- WebAuthn schemas ---
export {
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnOptionsResponseSchema,
  webauthnRegisterVerifyRequestSchema,
  webauthnRegisterVerifyResponseSchema,
  type WebauthnLoginOptionsRequest,
  type WebauthnLoginVerifyRequest,
  type WebauthnOptionsResponse,
  type WebauthnRegisterVerifyRequest,
  type WebauthnRegisterVerifyResponse,
} from './auth.webauth.schemas';

// --- Password validation ---
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordValidationResult,
} from './passwords/auth.password';

export { estimatePasswordStrength, type StrengthResult } from './passwords/auth.password.strength';

export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
  type PasswordPenalties,
} from './passwords/auth.password.scoring';

export {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './passwords/auth.password.patterns';

// --- Auth errors (canonical in engine/errors) ---
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../system/errors';

export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
};

// --- Sessions ---
export { getSessionAge, isSessionActive, isSessionRevoked } from './auth.sessions.logic';

export {
  createUserSessionSchema,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from './auth.sessions.schemas';

// --- Roles ---
export {
  appRoleSchema,
  permissionSchema,
  tenantRoleSchema,
  type AppRole,
  type Permission,
  type TenantRole,
} from './roles';

// --- Policy ---
export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource,
} from './auth.policy';
