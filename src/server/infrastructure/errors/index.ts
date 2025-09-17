import { ILoggerService } from "@/server/infrastructure/logging";
import { v4 as uuidv4 } from "uuid";

import { AppError } from "./AppError";

// Base error classes
export * from "./AppError";
export { ServiceError } from "./ServiceError";

// Infrastructure errors
export * from "./infrastructure/InfrastructureError";
export {
  DatabaseError as InfrastructureDatabaseError,
  EntityNotFoundError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
} from "./infrastructure/DatabaseError";
export type { ValidationErrorDetail } from "./infrastructure/ValidationError";

// Technical errors
export * from "./TechnicalError";

// Error handler
export * from "./ErrorHandler";
export * from "./IErrorHandler";

/**
 * Error codes for the application
 */
export enum ErrorCode {
  // Generic error codes
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",

  // 400 range client errors
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // 500 range server errors
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

/**
 * HTTP status codes for common errors
 */
export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Predefined error types for common use cases
 */

/**
 * Validation error - for invalid input data (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      metadata
    );
  }
}

/**
 * Authentication error - for missing or invalid authentication (401)
 */
export class AuthenticationError extends AppError {
  constructor(
    message = "Authentication required",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, metadata);
  }
}

/**
 * Permission error - for valid authentication but insufficient permissions (403)
 */
export class PermissionError extends AppError {
  constructor(
    message = "Permission denied",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, metadata);
  }
}

/**
 * Not found error - for requests to non-existent resources (404)
 */
export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, metadata);
  }
}

/**
 * Conflict error - for requests that would create a conflict (409)
 */
export class ConflictError extends AppError {
  constructor(
    message = "Resource conflict",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, ErrorCode.CONFLICT, HttpStatus.CONFLICT, metadata);
  }
}

/**
 * Service unavailable error - for when a service is temporarily unavailable (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = "Service unavailable",
    metadata: Record<string, unknown> = {}
  ) {
    super(
      message,
      ErrorCode.SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      metadata
    );
  }
}

/**
 * Database error - for database-related errors (500)
 */
export class DatabaseError extends AppError {
  constructor(
    message = "Database error",
    metadata: Record<string, unknown> = {}
  ) {
    super(
      message,
      ErrorCode.DATABASE_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      metadata
    );
  }
}

/**
 * Factory functions for creating errors
 */

/**
 * Create a validation error
 */
export function createValidationError(
  message: string,
  metadata?: Record<string, unknown>
): ValidationError {
  return new ValidationError(message, metadata);
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  message: string,
  metadata?: Record<string, unknown>
): NotFoundError {
  return new NotFoundError(message, metadata);
}

/**
 * Create an authentication error
 */
export function createAuthenticationError(
  message: string,
  metadata?: Record<string, unknown>
): AuthenticationError {
  return new AuthenticationError(message, metadata);
}

/**
 * Create a permission error
 */
export function createPermissionError(
  message: string,
  metadata?: Record<string, unknown>
): PermissionError {
  return new PermissionError(message, metadata);
}

/**
 * Create a conflict error
 */
export function createConflictError(
  message: string,
  metadata?: Record<string, unknown>
): ConflictError {
  return new ConflictError(message, metadata);
}

/**
 * Generate a unique correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Global error handling utilities
 */
export const GlobalErrorHandler = {
  /**
   * Register global handlers for unhandled rejections and exceptions
   * @param logger Logger service to use for logging errors
   */
  register: (logger: ILoggerService): void => {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });

      // In test environment, don't exit the process
      if (process.env.NODE_ENV !== "test") {
        // Give logger time to flush, then exit
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    });

    // Handle unhandled promise rejections
    process.on(
      "unhandledRejection",
      (reason: unknown, _promise: Promise<unknown>) => {
        logger.error("Unhandled Promise Rejection", {
          reason: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined,
        });
      }
    );
  },
};

// Base API Error class
export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request - Invalid request format or invalid data
export class ApiValidationError extends ApiError {
  constructor(message = "Bad request", errors?: Record<string, string[]>) {
    super(400, message, errors);
  }
}

// 401 Unauthorized - Authentication failure
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

// 403 Forbidden - Permission denied
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

// 404 Not Found - Resource doesn't exist
export class ApiNotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

// 409 Conflict - Resource already exists
export class ApiConflictError extends ApiError {
  constructor(message = "Conflict", errors?: Record<string, string[]>) {
    super(409, message, errors);
  }
}

// 500 Internal Server Error - Unexpected server error
export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, message);
  }
}

// 429 Too Many Requests - Rate limiting
export class TooManyRequestsError extends ApiError {
  metadata?: Record<string, unknown>;

  constructor(
    message = "Too many requests",
    metadata?: Record<string, unknown>
  ) {
    super(429, message);
    this.metadata = metadata;
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  _req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
): import("express").Response => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
