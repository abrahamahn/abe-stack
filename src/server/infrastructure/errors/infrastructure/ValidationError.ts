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
export class ValidationError extends Error {
  public readonly code: string;
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
  ) {
    super(entity ? `Validation failed for ${entity}` : "Validation failed");
    this.name = "ValidationError";
    this.code = code;
    this.details = details;
    this.entity = entity;
  }

  /**
   * Convert error to a JSON object suitable for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
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

    super(details, entity, "MISSING_REQUIRED_FIELDS");
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

    super(details, entity, "INVALID_FIELD_VALUE");
  }
}

export const ValidationErrors = {
  MissingRequiredFields: MissingRequiredFieldError,
  InvalidFieldValue: InvalidFieldValueError,
};
