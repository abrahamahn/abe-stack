import { AppError } from "@/server/infrastructure/errors";

/**
 * Base class for all technical errors
 * These are errors related to the application itself rather than domain or infrastructure
 */
export class TechnicalError extends AppError {
  /**
   * Create a new technical error
   * @param message Error message
   * @param code Error code
   * @param statusCode HTTP status code
   */
  constructor(message: string, code = "TECHNICAL_ERROR", statusCode = 500) {
    super(message, code, statusCode);
  }
}

/**
 * Error thrown when there's an issue with configuration
 */
export class ConfigurationError extends TechnicalError {
  readonly configKey?: string;

  /**
   * Create a new configuration error
   * @param message Error message
   * @param configKey Optional configuration key that caused the error
   */
  constructor(message: string, configKey?: string) {
    super(
      configKey
        ? `Configuration error for '${configKey}': ${message}`
        : message,
      "CONFIGURATION_ERROR",
    );
    this.configKey = configKey;
  }
}

/**
 * Error thrown when there's an issue with initialization
 */
export class InitializationError extends TechnicalError {
  readonly component: string;
  readonly cause?: Error | string;

  /**
   * Create a new initialization error
   * @param component Component that failed to initialize
   * @param cause Optional cause of the error
   */
  constructor(component: string, cause?: Error | string) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `Failed to initialize ${component}${causeMessage ? `: ${causeMessage}` : ""}`,
      "INITIALIZATION_ERROR",
    );
    this.component = component;
    this.cause = cause;
  }
}

/**
 * Error thrown when there's a system-level issue
 */
export class SystemError extends TechnicalError {
  readonly operation: string;
  readonly cause?: Error | string;

  /**
   * Create a new system error
   * @param operation Operation that failed
   * @param cause Optional cause of the error
   */
  constructor(operation: string, cause?: Error | string) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `System operation '${operation}' failed${causeMessage ? `: ${causeMessage}` : ""}`,
      "SYSTEM_ERROR",
    );
    this.operation = operation;
    this.cause = cause;
  }
}
