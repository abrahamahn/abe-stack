// backend/core/src/auth/utils/index.ts
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

export * from './cookies';
export * from './jwt';

export * from './password';
export * from './refresh-token';
export * from './request';
export * from './response';
