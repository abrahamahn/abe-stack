/**
 * Base error class that all domain errors should extend
 */
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a JSON object suitable for API responses
   */
  toJSON(): { code: string; message: string; name: string } {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
    };
  }
}
