// packages/shared/src/domain/auth/index.ts

export {
    defaultPasswordConfig,
    getStrengthColor,
    getStrengthLabel,
    validatePassword,
    validatePasswordBasic,
    type PasswordConfig,
    type PasswordValidationResult
} from './auth.password';

export {
    estimatePasswordStrength,
    type StrengthResult
} from './auth.password-strength';

export {
    calculateEntropy,
    calculateScore,
    estimateCrackTime,
    generateFeedback,
    type PasswordPenalties
} from './auth.password-scoring';

export {
    containsUserInput,
    hasKeyboardPattern,
    hasRepeatedChars,
    hasSequentialChars,
    isCommonPassword
} from './auth.password-patterns';

export { authContract } from './auth.contracts';

export { AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES } from './auth.messages';

// Only export auth-specific errors not already in core/errors.ts
export { AccountLockedError, EmailSendError } from './auth.errors';

export {
    HTTP_ERROR_MESSAGES,
    isKnownAuthError,
    mapErrorToHttpResponse,
    type ErrorMapperLogger,
    type ErrorMapperOptions,
    type ErrorStatusCode,
    type HttpErrorResponse
} from './auth.http-mapper';

export {
    authResponseSchema,
    changeEmailRequestSchema,
    changeEmailResponseSchema,
    confirmEmailChangeRequestSchema,
    confirmEmailChangeResponseSchema,
    emailVerificationRequestSchema,
    emailVerificationResponseSchema,
    forgotPasswordRequestSchema,
    forgotPasswordResponseSchema,
    loginRequestSchema,
    logoutResponseSchema,
    magicLinkRequestResponseSchema,
    magicLinkRequestSchema,
    magicLinkVerifyRequestSchema,
    magicLinkVerifyResponseSchema,
    refreshResponseSchema,
    registerRequestSchema,
    registerResponseSchema,
    resendVerificationRequestSchema,
    resendVerificationResponseSchema,
    resetPasswordRequestSchema,
    resetPasswordResponseSchema,
    setPasswordRequestSchema,
    setPasswordResponseSchema,
    totpSetupResponseSchema,
    totpStatusResponseSchema,
    totpVerifyRequestSchema,
    totpVerifyResponseSchema,
    type AuthResponse,
    type ChangeEmailRequest,
    type ChangeEmailResponse,
    type ConfirmEmailChangeRequest,
    type ConfirmEmailChangeResponse,
    type EmailVerificationRequest,
    type EmailVerificationResponse,
    type ForgotPasswordRequest,
    type ForgotPasswordResponse,
    type LoginRequest,
    type LogoutResponse,
    type MagicLinkRequest,
    type MagicLinkRequestResponse,
    type MagicLinkVerifyRequest,
    type MagicLinkVerifyResponse,
    type RefreshResponse,
    type RegisterRequest,
    type RegisterResponse,
    type ResendVerificationRequest,
    type ResendVerificationResponse,
    type ResetPasswordRequest,
    type ResetPasswordResponse,
    type SetPasswordRequest,
    type SetPasswordResponse,
    type TotpSetupResponse,
    type TotpStatusResponse,
    type TotpVerifyRequest,
    type TotpVerifyResponse
} from './auth.schemas';

