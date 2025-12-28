import { AppError } from "@/server/infrastructure/errors";

/**
 * Service-specific error class.
 * Used for errors that occur within application services.
 */
export class ServiceError extends AppError {
  /**
   * Create a new ServiceError
   * @param message Error message
   * @param code Error code
   * @param statusCode HTTP status code
   * @param metadata Additional metadata
   */
  constructor(
    message: string,
    code = "SERVICE_ERROR",
    statusCode = 500,
    metadata: Record<string, unknown> = {},
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Create a not found error
   * @param resource Resource type that wasn't found
   * @param id Identifier of the resource
   * @param message Custom message (optional)
   */
  static notFound(
    resource: string,
    id?: string | number,
    message?: string,
  ): ServiceError {
    const defaultMessage = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;

    return new ServiceError(message || defaultMessage, "NOT_FOUND", 404, {
      resource,
      resourceId: id,
    });
  }

  /**
   * Create a validation error
   * @param message Error message
   * @param validationErrors Validation errors
   */
  static validation(
    message = "Validation error",
    validationErrors: Record<string, string> = {},
  ): ServiceError {
    return new ServiceError(message, "VALIDATION_ERROR", 400, {
      validationErrors,
    });
  }

  /**
   * Create an unauthorized error
   * @param message Error message
   */
  static unauthorized(message = "Unauthorized"): ServiceError {
    return new ServiceError(message, "UNAUTHORIZED", 401);
  }

  /**
   * Create a forbidden error
   * @param message Error message
   */
  static forbidden(message = "Forbidden"): ServiceError {
    return new ServiceError(message, "FORBIDDEN", 403);
  }
}
