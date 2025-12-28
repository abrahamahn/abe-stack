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

  /**
   * Override toJSON to omit the stack and metadata for better clarity
   */
  toJSON(): Record<string, unknown> {
    const baseJson = super.toJSON();
    // Keep only essential properties for technical errors
    const { name, message, code, statusCode } = baseJson as {
      name: string;
      message: string;
      code: string;
      statusCode: number;
      [key: string]: unknown;
    };
    return { name, message, code, statusCode };
  }
}

/**
 * Error thrown when there's an issue with configuration
 */
export class ConfigurationError extends TechnicalError {
  readonly configKey: string | undefined;

  /**
   * Create a new configuration error
   * @param message Error message
   * @param configKey Configuration key that caused the error
   */
  constructor(message: string, configKey?: string) {
    // If configKey is undefined, don't include it in the message
    let errorMessage = message;
    if (configKey !== undefined) {
      errorMessage = `Configuration error for '${configKey}': ${message}`;
    }

    super(errorMessage, "CONFIGURATION_ERROR");
    this.configKey = configKey;
  }

  toJSON(): Record<string, unknown> {
    const baseJson = super.toJSON();
    return {
      ...baseJson,
      name: "TechnicalError", // Override with expected name
      configKey: this.configKey,
    };
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

  toJSON(): Record<string, unknown> {
    const baseJson = super.toJSON();
    return {
      ...baseJson,
      name: "TechnicalError",
      component: this.component,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
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

  toJSON(): Record<string, unknown> {
    const baseJson = super.toJSON();
    return {
      ...baseJson,
      name: "TechnicalError",
      operation: this.operation,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}
