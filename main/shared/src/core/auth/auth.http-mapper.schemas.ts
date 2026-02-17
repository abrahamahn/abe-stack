// main/shared/src/core/auth/auth.http-mapper.schemas.ts
/**
 * @file Auth HTTP Error Mapper
 * @description Centralized error-to-HTTP-response mapping for API handlers.
 *   Eliminates duplicate instanceof error checking across handlers.
 * @module Core/Auth
 */

import { AUTH_ERROR_NAMES, HTTP_ERROR_MESSAGES } from '../../engine/constants/platform';

export { HTTP_ERROR_MESSAGES };

// ============================================================================
// Types
// ============================================================================

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
 * Minimal logger interface for error mapping
 */
export interface ErrorMapperLogger {
  warn: (context: Record<string, unknown>, message: string) => void;
  error: (context: unknown, message?: string) => void;
}

/**
 * Narrowed shape of EmailSendError for cross-module boundary handling.
 * Uses structural typing instead of requiring class identity.
 */
export interface EmailSendErrorShape {
  name: string;
  message: string;
  originalError?: Error;
}

/**
 * Options for error mapping behavior
 */
export interface ErrorMapperOptions {
  /** If true, logs the error context. Default: false */
  logContext?: Record<string, unknown>;
  /** Custom handler for EmailSendError. If returns undefined, uses default. */
  onEmailSendError?: (error: EmailSendErrorShape) => HttpErrorResponse | undefined;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Type guard to check if error has a name property
 */
function hasName(error: unknown): error is { name: string } {
  return error !== null && typeof error === 'object' && 'name' in error;
}

/**
 * Type guard for EmailNotVerifiedError shape
 */
function isEmailNotVerifiedError(
  error: unknown,
): error is { name: string; message: string; email: string } {
  return (
    hasName(error) &&
    error.name === AUTH_ERROR_NAMES.EmailNotVerifiedError &&
    'email' in error &&
    'message' in error
  );
}

/**
 * Type guard for WeakPasswordError shape
 */
function isWeakPasswordError(
  error: unknown,
): error is { name: string; details?: Record<string, unknown> } {
  return hasName(error) && error.name === AUTH_ERROR_NAMES.WeakPasswordError;
}

/**
 * Type guard for EmailSendError shape
 */
function isEmailSendError(
  error: unknown,
): error is { name: string; message: string; originalError?: Error } {
  return hasName(error) && 'message' in error && error.name === AUTH_ERROR_NAMES.EmailSendError;
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
  // Use name-based checks for cross-module boundary compatibility
  if (!hasName(error)) {
    // Unknown error without name - log and return 500
    logger.error(error);
    return { status: 500, body: { message: HTTP_ERROR_MESSAGES.InternalError } };
  }

  // Account locked - rate limiting response
  if (error.name === AUTH_ERROR_NAMES.AccountLockedError) {
    return { status: 429, body: { message: HTTP_ERROR_MESSAGES.AccountLocked } };
  }

  // Email not verified - needs verification before login
  if (isEmailNotVerifiedError(error)) {
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
  if (error.name === AUTH_ERROR_NAMES.InvalidCredentialsError) {
    return { status: 401, body: { message: HTTP_ERROR_MESSAGES.InvalidCredentials } };
  }

  // Invalid or expired token
  if (error.name === AUTH_ERROR_NAMES.InvalidTokenError) {
    return { status: 400, body: { message: HTTP_ERROR_MESSAGES.InvalidToken } };
  }

  // Email already exists - conflict
  if (error.name === AUTH_ERROR_NAMES.EmailAlreadyExistsError) {
    return { status: 409, body: { message: HTTP_ERROR_MESSAGES.EmailAlreadyRegistered } };
  }

  // Weak password - validation failed
  if (isWeakPasswordError(error)) {
    if (options?.logContext !== undefined) {
      logger.warn(
        { ...options.logContext, errors: error.details?.['errors'] },
        'Password validation failed',
      );
    }
    return { status: 400, body: { message: HTTP_ERROR_MESSAGES.WeakPassword } };
  }

  // Email send error - may be handled differently per endpoint
  if (isEmailSendError(error)) {
    // Allow custom handling (some endpoints want 503, others want success to prevent enumeration)
    if (options?.onEmailSendError !== undefined) {
      const customResponse = options.onEmailSendError(error);
      if (customResponse !== undefined) {
        return customResponse;
      }
    }
    // Default: service unavailable
    const originalError = error.originalError;
    const errorMessage =
      originalError !== undefined && originalError instanceof Error
        ? originalError.message
        : undefined;
    logger.error(
      {
        originalError: errorMessage,
        ...options?.logContext,
      },
      'Email send failed',
    );
    return { status: 503, body: { message: HTTP_ERROR_MESSAGES.EmailSendFailed } };
  }

  // Fallback for any AppError subclass not explicitly handled above
  // (e.g. ConflictError, BadRequestError, etc.)
  // Uses the error's own statusCode and message rather than defaulting to 500
  if (
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const appError = error as { statusCode: number; message: string; code?: string };
    const status = appError.statusCode as ErrorStatusCode;
    if (status >= 400 && status < 600) {
      logger.warn(
        { errorName: error.name, statusCode: status, ...options?.logContext },
        `Unhandled app error: ${appError.message}`,
      );
      return {
        status,
        body: {
          message: appError.message,
          ...(typeof appError.code === 'string' ? { code: appError.code } : {}),
        },
      };
    }
  }

  // Unknown error - log and return 500
  logger.error(error);
  return { status: 500, body: { message: HTTP_ERROR_MESSAGES.InternalError } };
}

/**
 * Type guard to check if an error is a known application error.
 * Uses name-based checking for cross-module boundary compatibility.
 *
 * @param error - The error to check
 * @returns True if the error is a known auth error type
 */
export function isKnownAuthError(error: unknown): boolean {
  if (!hasName(error)) {
    return false;
  }

  const knownNames: readonly string[] = Object.values(AUTH_ERROR_NAMES);
  return knownNames.includes(error.name);
}
