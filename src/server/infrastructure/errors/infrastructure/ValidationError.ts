import { AppError } from "@/server/infrastructure/errors";

/**
 * Interface for validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * Base error class for validation errors
 */
export class ValidationError extends AppError {
  public readonly details: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  public readonly entity?: string;

  constructor(
    details: Array<{
      field: string;
      message: string;
      code?: string;
    }>,
    entity?: string,
    code: string = "VALIDATION_ERROR",
    statusCode: number = 400,
  ) {
    super(
      entity ? `Validation failed for ${entity}` : "Validation failed",
      code,
      statusCode,
    );
    this.details = details;
    this.entity = entity;
  }

  /**
   * Convert error to a JSON object suitable for API responses
   */
  toJSON(): Record<string, unknown> {
    // Format the JSON as expected by API clients
    return {
      name: "ValidationError",
      code: this.code,
      message: this.message,
      details: this.details,
      entity: this.entity,
    };
  }
}

/**
 * Error thrown when required fields are missing
 */
export class MissingRequiredFieldError extends ValidationError {
  constructor(fields: string[], entity?: string) {
    const details = fields.map((field) => ({
      field,
      message: "Field is required",
      code: "REQUIRED_FIELD",
    }));

    super(details, entity, "MISSING_REQUIRED_FIELDS", 400);
  }

  /**
   * Override toJSON to ensure "ValidationError" is used as name for consistency
   */
  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    return {
      ...json,
      name: "ValidationError", // Consistent name for all validation errors
    };
  }
}

/**
 * Error thrown when a field has an invalid value
 */
export class InvalidFieldValueError extends ValidationError {
  constructor(field: string, message: string, entity?: string) {
    const details = [
      {
        field,
        message,
        code: "INVALID_VALUE",
      },
    ];

    super(details, entity, "INVALID_FIELD_VALUE", 400);
  }

  /**
   * Override toJSON to ensure "ValidationError" is used as name for consistency
   */
  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    return {
      ...json,
      name: "ValidationError", // Consistent name for all validation errors
    };
  }
}

export const ValidationErrors = {
  MissingRequiredFields: MissingRequiredFieldError,
  InvalidFieldValue: InvalidFieldValueError,
};
