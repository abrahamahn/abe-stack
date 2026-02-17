// main/shared/src/engine/auth/index.ts

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

export { getRefreshCookieOptions, isStrategyEnabled } from './auth-helpers';
