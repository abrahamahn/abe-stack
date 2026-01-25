// packages/core/src/modules/auth/httpMapper.ts
/**
 * HTTP Error Mapper
 *
 * Centralized error-to-HTTP-response mapping for API handlers.
 * Eliminates duplicate instanceof error checking across handlers.
 */

import {
    AccountLockedError,
    EmailAlreadyExistsError,
    EmailNotVerifiedError,
    EmailSendError,
    InvalidCredentialsError,
    InvalidTokenError,
    WeakPasswordError,
} from './errors';

/**
 * HTTP status codes returned by error mapper
 */
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;

/**
 * Standard error response structure
 */
export interface HttpErrorResponse {
  status: ErrorStatusCode;
  body: {
    message: string;
    code?: string;
    email?: string;
  };
}

/**
 * Standard error messages for HTTP responses
 */
export const HTTP_ERROR_MESSAGES = {
  ACCOUNT_LOCKED:
    'Account temporarily locked due to too many failed attempts. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  INVALID_TOKEN: 'Invalid or expired token',
  WEAK_PASSWORD: 'Password is too weak',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',
  INTERNAL_ERROR: 'Internal server error',
} as const;

/**
 * Minimal logger interface for error mapping
 */
export interface ErrorMapperLogger {
  warn: (context: Record<string, unknown>, message: string) => void;
  error: (context: unknown, message?: string) => void;
}

/**
 * Options for error mapping behavior
 */
export interface ErrorMapperOptions {
  /** If true, logs the error context. Default: false */
  logContext?: Record<string, unknown>;
  /** Custom handler for EmailSendError. If returns undefined, uses default. */
  onEmailSendError?: (error: EmailSendError) => HttpErrorResponse | undefined;
}

/**
 * Maps known application errors to HTTP responses.
 *
 * This function handles common auth error types and returns appropriate
 * HTTP status codes and messages. Unknown errors return a 500 status.
 *
 * @param error - The caught error
 * @param logger - Logger instance for error logging
 * @param options - Optional configuration for error handling
 * @returns Structured error response with status and body
 *
 * @example
 * ```typescript
 * try {
 *   await authenticateUser(...);
 * } catch (error) {
 *   return mapErrorToHttpResponse(error, ctx.log);
 * }
 * ```
 */
export function mapErrorToHttpResponse(
  error: unknown,
  logger: ErrorMapperLogger,
  options?: ErrorMapperOptions,
): HttpErrorResponse {
  // Account locked - rate limiting response
  if (error instanceof AccountLockedError) {
    return { status: 429, body: { message: HTTP_ERROR_MESSAGES.ACCOUNT_LOCKED } };
  }

  // Email not verified - needs verification before login
  if (error instanceof EmailNotVerifiedError) {
    return {
      status: 401,
      body: {
        message: error.message,
        code: 'EMAIL_NOT_VERIFIED',
        email: error.email,
      },
    };
  }

  // Invalid credentials - wrong email/password
  if (error instanceof InvalidCredentialsError) {
    return { status: 401, body: { message: HTTP_ERROR_MESSAGES.INVALID_CREDENTIALS } };
  }

  // Invalid or expired token
  if (error instanceof InvalidTokenError) {
    return { status: 400, body: { message: HTTP_ERROR_MESSAGES.INVALID_TOKEN } };
  }

  // Email already exists - conflict
  if (error instanceof EmailAlreadyExistsError) {
    return { status: 409, body: { message: HTTP_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED } };
  }

  // Weak password - validation failed
  if (error instanceof WeakPasswordError) {
    if (options?.logContext) {
      logger.warn(
        { ...options.logContext, errors: error.details?.errors },
        'Password validation failed',
      );
    }
    return { status: 400, body: { message: HTTP_ERROR_MESSAGES.WEAK_PASSWORD } };
  }

  // Email send error - may be handled differently per endpoint
  if (error instanceof EmailSendError) {
    // Allow custom handling (some endpoints want 503, others want success to prevent enumeration)
    if (options?.onEmailSendError) {
      const customResponse = options.onEmailSendError(error);
      if (customResponse) {
        return customResponse;
      }
    }
    // Default: service unavailable
    logger.error(
      { originalError: (error.originalError as Error | undefined)?.message, ...options?.logContext },
      'Email send failed',
    );
    return { status: 503, body: { message: HTTP_ERROR_MESSAGES.EMAIL_SEND_FAILED } };
  }

  // Unknown error - log and return 500
  logger.error(error);
  return { status: 500, body: { message: HTTP_ERROR_MESSAGES.INTERNAL_ERROR } };
}

/**
 * Type guard to check if an error is a known application error
 */
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
