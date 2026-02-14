// main/server/core/src/auth/utils/errors.ts
/**
 * Re-exports auth domain errors from shared package.
 *
 * @module @abe-stack/auth/utils/errors
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
} from '@abe-stack/shared'; // Changed from @abe-stack/shared
