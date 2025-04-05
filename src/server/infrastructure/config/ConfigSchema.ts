/**
 * Configuration schema field definition
 */
export interface ConfigSchemaField {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  default?: unknown;
  secret?: boolean;
  description?: string;
  errorMessage?: string; // Custom error message for validation failures

  // Validation rules
  pattern?: RegExp;
  enum?: readonly (string | number)[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  arrayType?: "string" | "number" | "boolean";
  validator?: (value: unknown) => boolean;
}

/**
 * Configuration schema
 */
export interface ConfigSchema {
  properties: Record<string, ConfigSchemaField>;
}

/**
 * Validated configuration result
 */
export interface ValidatedConfig {
  valid: boolean;
  errors: string[];
  values: Record<string, unknown>;
}

/**
 * Validates a configuration against a schema
 *
 * @param config Configuration to validate
 * @param schema Schema to validate against
 * @returns Validation result
 */
export function validateConfig(
  config: Record<string, string>,
  schema: ConfigSchema,
): ValidatedConfig {
  const result: ValidatedConfig = {
    valid: true,
    errors: [],
    values: {},
  };

  if (!config || typeof config !== "object") {
    result.valid = false;
    result.errors.push("Configuration is not a valid object");
    return result;
  }

  if (!schema || typeof schema !== "object" || !schema.properties) {
    result.valid = false;
    result.errors.push("Schema is not a valid object with properties");
    return result;
  }

  // Validate each field in schema
  for (const [key, field] of Object.entries(schema.properties)) {
    let value: unknown = config[key];

    // Apply default if value is undefined
    if (value === undefined && field.default !== undefined) {
      value = field.default;
    }

    // Convert value based on type
    if (value !== undefined) {
      try {
        value = convertValue(value, field);
      } catch (error) {
        result.errors.push(
          `Error converting ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.valid = false;
        continue;
      }
    }

    // Check if required
    if (field.required && value === undefined) {
      // Use custom error message if provided, otherwise use default
      const errorMessage = field.errorMessage || `${key} is required`;
      result.errors.push(errorMessage);
      result.valid = false;
      continue;
    }

    // Skip further validation if no value
    if (value === undefined) {
      result.values[key] = undefined;
      continue;
    }

    // Type-specific validations
    if (!validateFieldValue(key, value, field, result)) {
      continue;
    }

    // Store validated value
    result.values[key] = value;
  }

  return result;
}

/**
 * Converts a string value to the appropriate type
 *
 * @param value Value to convert
 * @param field Schema field
 * @returns Converted value
 */
function convertValue(value: unknown, field: ConfigSchemaField): unknown {
  // If value is already converted (not a string), return as is
  if (typeof value !== "string") {
    return value;
  }

  switch (field.type) {
    case "string":
      return value;

    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${value}`);
      }
      return num;
    }

    case "boolean":
      if (value.toLowerCase() === "true" || value === "1" || value === "yes") {
        return true;
      }
      if (value.toLowerCase() === "false" || value === "0" || value === "no") {
        return false;
      }
      throw new Error(`Invalid boolean: ${value}`);

    case "array":
      return value.split(",").map((item) => {
        const trimmed = item.trim();
        if (field.arrayType === "number") {
          const num = Number(trimmed);
          if (isNaN(num)) {
            throw new Error(`Invalid number in array: ${trimmed}`);
          }
          return num;
        }
        if (field.arrayType === "boolean") {
          const lower = trimmed.toLowerCase();
          if (lower === "true" || lower === "1" || lower === "yes") {
            return true;
          }
          if (lower === "false" || lower === "0" || lower === "no") {
            return false;
          }
          throw new Error(`Invalid boolean in array: ${trimmed}`);
        }
        return trimmed;
      });

    case "object":
      try {
        return JSON.parse(value);
      } catch (_error) {
        throw new Error(`Invalid JSON: ${value}`);
      }

    default:
      return value;
  }
}

// Helper to create error message with possible custom override
function createErrorMessage(
  field: ConfigSchemaField,
  defaultMessage: string,
): string {
  return field.errorMessage || defaultMessage;
}

/**
 * Validates a field value against validation rules
 *
 * @param key Field key
 * @param value Field value
 * @param field Schema field
 * @param result Validation result
 * @returns True if valid, false otherwise
 */
function validateFieldValue(
  key: string,
  value: unknown,
  field: ConfigSchemaField,
  result: ValidatedConfig,
): boolean {
  // String validations
  if (field.type === "string" && typeof value === "string") {
    // Pattern check
    if (field.pattern && !field.pattern.test(value)) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} does not match pattern ${field.pattern}`,
        ),
      );
      result.valid = false;
      return false;
    }

    // Enum check
    if (field.enum && !field.enum.includes(value)) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} must be one of: ${field.enum.join(", ")}`,
        ),
      );
      result.valid = false;
      return false;
    }

    // Length checks
    if (field.minLength !== undefined && value.length < field.minLength) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} is too short (min ${field.minLength} characters)`,
        ),
      );
      result.valid = false;
      return false;
    }

    if (field.maxLength !== undefined && value.length > field.maxLength) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} is too long (max ${field.maxLength} characters)`,
        ),
      );
      result.valid = false;
      return false;
    }
  }

  // Number validations
  if (field.type === "number" && typeof value === "number") {
    // Range checks
    if (field.min !== undefined && value < field.min) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} is too small (min ${field.min})`,
        ),
      );
      result.valid = false;
      return false;
    }

    if (field.max !== undefined && value > field.max) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} is too large (max ${field.max})`,
        ),
      );
      result.valid = false;
      return false;
    }

    // Enum check
    if (field.enum && !field.enum.includes(value)) {
      result.errors.push(
        createErrorMessage(
          field,
          `Value for ${key} must be one of: ${field.enum.join(", ")}`,
        ),
      );
      result.valid = false;
      return false;
    }
  }

  // Custom validator
  if (field.validator && !field.validator(value)) {
    result.errors.push(
      createErrorMessage(field, `Invalid value for configuration key: ${key}`),
    );
    result.valid = false;
    return false;
  }

  return true;
}

export type ConfigValueType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

export interface ConfigSchemaEntry {
  type: ConfigValueType;
  description: string;
  required?: boolean;
  default?: unknown;
  validate?: (value: unknown) => boolean;
  transform?: (value: unknown) => unknown;
}

export type ConfigSchemaDefinition = Record<string, ConfigSchemaEntry>;

export interface ConfigValidationError {
  key: string;
  message: string;
  value?: unknown;
  expected?: unknown;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
}
