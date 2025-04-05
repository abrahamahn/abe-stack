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
    metadata: Record<string, unknown> | null = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    // Handle null metadata and ensure metadata is immutable with deep clone
    this.metadata = metadata ? this.deepClone(metadata) : {};

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Deep clone an object with circular reference handling
   * @param obj Object to clone
   * @returns Deep cloned object
   */
  private deepClone<T>(obj: T): T {
    const seen = new WeakMap();

    return JSON.parse(
      JSON.stringify(obj, (_key, value) => {
        // Handle circular references
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]";
          }
          seen.set(value, true);
        }
        return value;
      }),
    );
  }

  /**
   * Convert the error to a JSON-friendly format
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
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
