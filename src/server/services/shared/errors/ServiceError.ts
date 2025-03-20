/**
 * Base error class for service-level errors
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends ServiceError {
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

/**
 * Error thrown when a duplicate resource is detected
 */
export class DuplicateResourceError extends ServiceError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`);
    this.name = "DuplicateResourceError";
  }
}

/**
 * Error thrown when an operation is not authorized
 */
export class UnauthorizedError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when an operation is not permitted
 */
export class ForbiddenError extends ServiceError {
  constructor(message = "Operation not permitted") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Error thrown when there's an issue with external service integration
 */
export class ExternalServiceError extends ServiceError {
  constructor(service: string, details?: string) {
    super(
      `Error in external service ${service}${details ? `: ${details}` : ""}`,
    );
    this.name = "ExternalServiceError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}

export class TooManyRequestsError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}
