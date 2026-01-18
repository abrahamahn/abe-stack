// packages/core/src/index.ts
// @auto-generated - Do not edit manually

export { loadServerEnv, serverEnvSchema } from './env';
export type { ServerEnv } from './env';
export { DAYS_PER_WEEK, HOURS_PER_DAY, HTTP_STATUS, MINUTES_PER_HOUR, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND, SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE, type HttpStatusCode } from './constants';
export { USER_ROLES, adminContract, apiContract, authContract, authResponseSchema, emailVerificationRequestSchema, emailVerificationResponseSchema, errorResponseSchema, loginRequestSchema, logoutResponseSchema, refreshResponseSchema, registerRequestSchema, unlockAccountRequestSchema, unlockAccountResponseSchema, userResponseSchema, userRoleSchema, userSchema, usersContract, webBridge } from './contracts';
export type { ApiContract, AuthResponse, EmailVerificationRequest, EmailVerificationResponse, ErrorResponse, LoginRequest, LogoutResponse, NativeBridge, RefreshResponse, RegisterRequest, UnlockAccountRequest, UnlockAccountResponse, UserResponse, UserRole } from './contracts';
export { // Deprecated aliases
  PermissionError, AccountLockedError, AppError, BadRequestError, ConflictError, EmailAlreadyExistsError, ForbiddenError, InternalError, InvalidCredentialsError, InvalidTokenError, NotFoundError, OAuthError, OAuthStateMismatchError, RateLimitError, TokenReuseError, TooManyRequestsError, TotpInvalidError, TotpRequiredError, UnauthorizedError, UnprocessableError, UserNotFoundError, ValidationError, WeakPasswordError, getErrorStatusCode, getSafeErrorMessage, isAppError, isErrorResponse, isSuccessResponse, toAppError } from './errors';
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from './errors';
export { toastStore, type ToastMessage } from './stores';
export { addAuthHeader, createTokenStore, tokenStore } from './utils';
export type { TokenStore } from './utils';
export { defaultPasswordConfig, estimatePasswordStrength, getStrengthColor, getStrengthLabel, validatePassword, validatePasswordBasic } from './validation';
export type { PasswordConfig, PasswordValidationResult, StrengthResult } from './validation';
