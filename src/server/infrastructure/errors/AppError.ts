/**
 * The base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  /**
   * Error code for identifying the error type
   */
  readonly code: string;

  /**
   * HTTP status code for the error (if applicable)
   */
  readonly statusCode: number;

  /**
   * Additional error metadata
   */
  readonly metadata: Record<string, unknown>;

  /**
   * Create a new AppError
   * @param message Error message
   * @param code Error code
   * @param statusCode HTTP status code
   * @param metadata Additional metadata
   */
  constructor(
    message: string,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert the error to a JSON-friendly format
   */
  toJSON(): Record<string, unknown> {
    // Handle circular references and ensure proper conversion
    const safeMetadata = JSON.parse(JSON.stringify(this.metadata));

    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: safeMetadata,
      stack: this.stack,
    };
  }

  /**
   * Get a string representation of the error
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}
