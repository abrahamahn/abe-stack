import { ValidationError as IValidationError } from "@services/shared/types/validation";

/**
 * Error thrown when validation fails
 */
export class ValidationFailedError extends Error {
  public errors: IValidationError[];

  constructor(errors: IValidationError[]) {
    super("Validation failed");
    this.name = "ValidationFailedError";
    this.errors = errors;
  }
}
