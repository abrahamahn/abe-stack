// main/shared/src/core/auth/index.ts
/**
 * @file Auth Module Barrel
 * @description Central exports for authentication schemas, errors, helpers,
 *   password validation, roles, and session management.
 * @module Core/Auth
 */

export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordValidationResult,
} from './auth.password';

export { estimatePasswordStrength, type StrengthResult } from './auth.password-strength';

export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
  type PasswordPenalties,
} from './auth.password-scoring';

export {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './auth.password-patterns';

import { authContract } from '../../contracts';

export { authContract };

export { AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES } from './auth.messages';

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
} from './auth.errors';

export {
  HTTP_ERROR_MESSAGES,
  isKnownAuthError,
  mapErrorToHttpResponse,
  type ErrorMapperLogger,
  type ErrorMapperOptions,
  type ErrorStatusCode,
  type HttpErrorResponse,
} from './auth.http-mapper';

export {
  acceptTosRequestSchema,
  acceptTosResponseSchema,
  authResponseSchema,
  bffLoginResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  deviceItemSchema,
  deviceListResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  invalidateSessionsResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  passkeyListItemSchema,
  passkeyListResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  removePhoneResponseSchema,
  renamePasskeyRequestSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  revertEmailChangeRequestSchema,
  revertEmailChangeResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  sudoRequestSchema,
  sudoResponseSchema,
  tosStatusResponseSchema,
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  trustDeviceResponseSchema,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnOptionsResponseSchema,
  webauthnRegisterVerifyRequestSchema,
  webauthnRegisterVerifyResponseSchema,
  type AcceptTosRequest,
  type AcceptTosResponse,
  type AuthResponse,
  type BffLoginResponse,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type ConfirmEmailChangeRequest,
  type ConfirmEmailChangeResponse,
  type DeviceItem,
  type DeviceListResponse,
  type EmailVerificationRequest,
  type EmailVerificationResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type InvalidateSessionsResponse,
  type LoginRequest,
  type LoginSuccessResponse,
  type LogoutResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
  type MagicLinkVerifyResponse,
  type PasskeyListItem,
  type RefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type RemovePhoneResponse,
  type RenamePasskeyRequest,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type RevertEmailChangeRequest,
  type RevertEmailChangeResponse,
  type SetPasswordRequest,
  type SetPasswordResponse,
  type SetPhoneRequest,
  type SetPhoneResponse,
  type SmsChallengeRequest,
  type SmsChallengeResponse,
  type SmsLoginChallengeResponse,
  type SmsVerifyRequest,
  type SudoRequest,
  type SudoResponse,
  type TosStatusResponse,
  type TotpLoginChallengeResponse,
  type TotpLoginVerifyRequest,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
  type TrustDeviceResponse,
  type VerifyPhoneRequest,
  type VerifyPhoneResponse,
  type WebauthnLoginOptionsRequest,
  type WebauthnLoginVerifyRequest,
  type WebauthnOptionsResponse,
  type WebauthnRegisterVerifyRequest,
  type WebauthnRegisterVerifyResponse,
} from './auth.schemas';

export {
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  oauthContract,
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
} from './auth.oauth';

// --- auth-sessions.logic ---
export {
  getSessionAge,
  isSessionActive,
  isSessionRevoked,
} from './auth-sessions.logic';

// --- auth-sessions.schemas ---
export {
  createUserSessionSchema,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from './auth-sessions.schemas';

// --- roles ---
export {
  appRoleSchema,
  permissionSchema,
  tenantRoleSchema,
  type AppRole,
  type Permission,
  type TenantRole,
} from './roles';
