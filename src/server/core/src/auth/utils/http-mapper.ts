// backend/core/src/auth/utils/http-mapper.ts
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@abe-stack/shared'; // from '@abe-stack/shared'

export const HTTP_ERROR_MESSAGES = {
  InvalidCredentials: 'Invalid email or password',
  WeakPassword: 'Password is too weak',
  AccountLocked: 'Account temporarily locked due to too many failed attempts',
  EmailAlreadyRegistered: 'Email already registered',
  EmailNotVerified: 'Please verify your email address before logging in',
  InvalidToken: 'Invalid or expired token',
  EmailSendFailed: 'Failed to send email. Please try again or use the resend option.',
  InternalError: 'An unexpected error occurred',
} as const;

export type HttpErrorResponse = {
  status: number;
  body: {
    message: string;
    code?: string;
    email?: string;
    retryAfter?: number;
  };
};

export type ErrorMapperLogger = {
  warn: (context: Record<string, unknown>, message: string) => void;
  error: (context: unknown, message?: string) => void;
};

export type ErrorMapperOptions = {
  logContext?: Record<string, unknown> | undefined;
  onEmailSendError?: (error: EmailSendError) => HttpErrorResponse;
};

export function isKnownAuthError(error: unknown): boolean {
  return (
    error instanceof AccountLockedError ||
    error instanceof EmailNotVerifiedError ||
    error instanceof InvalidCredentialsError ||
    error instanceof InvalidTokenError ||
    error instanceof EmailAlreadyExistsError ||
    error instanceof WeakPasswordError ||
    error instanceof EmailSendError
  );
}

export function mapErrorToHttpResponse(
  error: unknown,
  logger: ErrorMapperLogger,
  options: ErrorMapperOptions = {},
): HttpErrorResponse {
  if (error instanceof InvalidCredentialsError) {
    return {
      status: 401,
      body: { message: HTTP_ERROR_MESSAGES.InvalidCredentials },
    };
  }

  if (error instanceof WeakPasswordError) {
    const weakPasswordError: WeakPasswordError = error;
    if (options.logContext !== undefined) {
      const details = weakPasswordError.details;
      logger.warn(
        {
          ...options.logContext,
          errors: details?.['errors'],
        },
        'Password validation failed',
      );
    }
    return {
      status: 400,
      body: { message: HTTP_ERROR_MESSAGES.WeakPassword },
    };
  }

  if (error instanceof AccountLockedError) {
    const lockedError: AccountLockedError = error;
    const body: { message: string; retryAfter?: number } = {
      message: HTTP_ERROR_MESSAGES.AccountLocked,
    };
    if (lockedError.retryAfter !== undefined) {
      body.retryAfter = lockedError.retryAfter;
    }
    return {
      status: 429,
      body,
    };
  }

  if (error instanceof EmailAlreadyExistsError) {
    return {
      status: 409,
      body: { message: HTTP_ERROR_MESSAGES.EmailAlreadyRegistered },
    };
  }

  if (error instanceof EmailNotVerifiedError) {
    const notVerifiedError: EmailNotVerifiedError = error;
    return {
      status: 401,
      body: {
        message: HTTP_ERROR_MESSAGES.EmailNotVerified,
        code: notVerifiedError.code,
        email: notVerifiedError.email,
      },
    };
  }

  if (error instanceof InvalidTokenError) {
    return {
      status: 400,
      body: { message: HTTP_ERROR_MESSAGES.InvalidToken },
    };
  }

  if (error instanceof EmailSendError) {
    if (options.onEmailSendError !== undefined) {
      return options.onEmailSendError(error);
    }

    return {
      status: 503,
      body: { message: HTTP_ERROR_MESSAGES.EmailSendFailed },
    };
  }

  if (error instanceof Error) {
    logger.error(error);
  }

  return {
    status: 500,
    body: { message: HTTP_ERROR_MESSAGES.InternalError },
  };
}
