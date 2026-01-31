// shared/core/src/infrastructure/errors/base.ts
/**
 * Base Application Error
 *
 * All custom errors extend this class. Provides:
 * - HTTP status code for API responses
 * - Error code for client-side error handling
 * - Details object for additional context
 * - toJSON() for consistent API serialization
 */

import { HTTP_STATUS } from '../../shared/constants/index';

/**
 * Base abstract error class for the clean architecture.
 * All domain and infrastructure errors should extend this.
 */
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;

  protected constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Base application error class
 * All custom errors should extend this
 */
export class AppError extends BaseError {
  constructor(
    message: string,
    public readonly statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  toJSON(): {
    error: string;
    message: string;
    code?: string | undefined;
    details?: Record<string, unknown> | undefined;
  } {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return new AppError('An unexpected error occurred', HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

/**
 * Get a safe error message for API responses
 * In production, hides internal error details
 */
export function getSafeErrorMessage(error: unknown, isProduction: boolean): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (!isProduction && error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get the HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
