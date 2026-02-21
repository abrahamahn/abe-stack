// main/server/core/src/auth/utils/errors.ts
/**
 * Re-exports auth domain errors from shared package.
 *
 * @module @bslt/auth/utils/errors
 */
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
} from '@bslt/shared'; // Changed from @bslt/shared
