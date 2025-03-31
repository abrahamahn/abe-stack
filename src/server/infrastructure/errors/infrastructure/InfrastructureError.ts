import { BaseError } from "@/server/infrastructure/errors";

/**
 * Base class for all infrastructure-related errors
 * This includes errors with databases, caches, external services, etc.
 */
export class InfrastructureError extends BaseError {
  /**
   * Create a new infrastructure error
   * @param message Error message
   * @param code Error code
   */
  constructor(message: string, code = "INFRASTRUCTURE_ERROR") {
    super(message, code);
  }
}

/**
 * Error thrown when a cache operation fails
 */
export class CacheError extends InfrastructureError {
  readonly operation: string;
  readonly key?: string;
  readonly cause?: Error | string;

  /**
   * Create a new cache error
   * @param operation Operation that failed (get, set, delete, etc.)
   * @param key Optional cache key that was being accessed
   * @param cause Optional cause of the error
   */
  constructor(operation: string, key?: string, cause?: Error | string) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `Cache operation '${operation}'${key ? ` for key '${key}'` : ""} failed${causeMessage ? `: ${causeMessage}` : ""}`,
      "CACHE_ERROR",
    );
    this.operation = operation;
    this.key = key;
    this.cause = cause;
  }
}

/**
 * Error thrown when a network operation fails
 */
export class NetworkError extends InfrastructureError {
  readonly url?: string;
  readonly statusCode?: number;
  readonly cause?: Error | string;

  /**
   * Create a new network error
   * @param url Optional URL that was being accessed
   * @param statusCode Optional HTTP status code
   * @param cause Optional cause of the error
   */
  constructor(url?: string, statusCode?: number, cause?: Error | string) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `Network request${url ? ` to '${url}'` : ""}${statusCode ? ` failed with status ${statusCode}` : " failed"}${causeMessage ? `: ${causeMessage}` : ""}`,
      "NETWORK_ERROR",
    );
    this.url = url;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

/**
 * Error thrown when an external service operation fails
 */
export class ExternalServiceError extends InfrastructureError {
  readonly service: string;
  readonly operation: string;
  readonly cause?: Error | string;

  /**
   * Create a new external service error
   * @param service External service name
   * @param operation Operation that failed
   * @param cause Optional cause of the error
   */
  constructor(service: string, operation: string, cause?: Error | string) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `External service '${service}' operation '${operation}' failed${causeMessage ? `: ${causeMessage}` : ""}`,
      "EXTERNAL_SERVICE_ERROR",
    );
    this.service = service;
    this.operation = operation;
    this.cause = cause;
  }
}
