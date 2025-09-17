import { Validator } from "@/server/services/shared/validation/ValidationRule";

/**
 * Common validator functions that can be reused across services
 */
export const commonValidators = {
  /**
   * Validates that a value is not undefined or null
   */
  required:
    (field: string): Validator =>
    (value: unknown): string | null =>
      value === undefined || value === null ? `${field} is required` : null,

  /**
   * Validates that a string meets minimum length requirement
   */
  minLength:
    (field: string, min: number): Validator =>
    (value: unknown): string | null =>
      typeof value === "string" && value.length < min
        ? `${field} must be at least ${min} characters`
        : null,

  /**
   * Validates that a string doesn't exceed maximum length
   */
  maxLength:
    (field: string, max: number): Validator =>
    (value: unknown): string | null =>
      typeof value === "string" && value.length > max
        ? `${field} must not exceed ${max} characters`
        : null,

  /**
   * Validates that a value is a valid email address
   */
  email:
    (field: string): Validator =>
    (value: unknown): string | null =>
      typeof value === "string" && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        ? `${field} must be a valid email address`
        : null,

  /**
   * Validates that a value matches a regular expression pattern
   */
  pattern:
    (field: string, pattern: RegExp, message?: string): Validator =>
    (value: unknown): string | null =>
      typeof value === "string" && !pattern.test(value)
        ? message || `${field} format is invalid`
        : null,

  /**
   * Validates that a number is within a specified range
   */
  range:
    (field: string, min: number, max: number): Validator =>
    (value: unknown): string | null =>
      typeof value === "number" && (value < min || value > max)
        ? `${field} must be between ${min} and ${max}`
        : null,

  /**
   * Validates that a value is one of a set of allowed values
   */
  oneOf:
    (field: string, allowedValues: unknown[]): Validator =>
    (value: unknown): string | null =>
      !allowedValues.includes(value)
        ? `${field} must be one of: ${allowedValues.join(", ")}`
        : null,

  /**
   * Validates that a value is a valid URL
   */
  url:
    (field: string): Validator =>
    (value: unknown): string | null => {
      if (typeof value !== "string") return `${field} must be a string`;
      try {
        new URL(value);
        return null;
      } catch {
        return `${field} must be a valid URL`;
      }
    },

  /**
   * Validates that a value is a valid UUID
   */
  uuid:
    (field: string): Validator =>
    (value: unknown): string | null =>
      typeof value === "string" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
        ? `${field} must be a valid UUID`
        : null,

  /**
   * Validates that an array has a specific length
   */
  arrayLength:
    (field: string, min?: number, max?: number): Validator =>
    (value: unknown): string | null => {
      if (!Array.isArray(value)) return `${field} must be an array`;
      if (min !== undefined && value.length < min)
        return `${field} must contain at least ${min} items`;
      if (max !== undefined && value.length > max)
        return `${field} must not contain more than ${max} items`;
      return null;
    },
};
