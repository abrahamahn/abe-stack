// src/server/core/src/auth/utils/index.ts
export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from './errors';
export { HTTP_ERROR_MESSAGES, isKnownAuthError, mapErrorToHttpResponse } from './http-mapper';
export type { ErrorMapperLogger, ErrorMapperOptions, HttpErrorResponse } from './http-mapper';

export { setRefreshTokenCookie, clearRefreshTokenCookie } from './cookies';
export type { TokenPayload } from './jwt';
export {
  JwtError,
  createAccessToken,
  verifyToken,
  createRefreshToken,
  getRefreshTokenExpiry,
} from './jwt';
export {
  hashPassword,
  verifyPassword,
  needsRehash,
  initDummyHashPool,
  isDummyHashPoolInitialized,
  resetDummyHashPool,
  verifyPasswordSafe,
} from './password';
export {
  createRefreshTokenFamily,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  cleanupExpiredTokens,
} from './refresh-token';
export type { RequestInfo, RequestWithClientInfo } from './request';
export { extractRequestInfo } from './request';
export type { AuthUser, AuthResponseData } from './response';
export { createAuthResponse } from './response';
export { generateUniqueUsername, splitFullName } from './username';
