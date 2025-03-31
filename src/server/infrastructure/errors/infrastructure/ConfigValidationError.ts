/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends Error {
  /**
   * Validation error messages
   */
  public readonly errors: string[];

  /**
   * Creates a new ConfigValidationError
   *
   * @param message Error message
   * @param errors Validation error messages
   */
  constructor(message: string, errors: string[]) {
    super(message);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }

  /**
   * Gets a formatted error message with all validation errors
   *
   * @returns Formatted error message
   */
  getFormattedMessage(): string {
    return [
      this.message,
      "",
      "Validation errors:",
      ...this.errors.map((error) => `- ${error}`),
    ].join("\n");
  }
}
