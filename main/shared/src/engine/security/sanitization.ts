// main/shared/src/engine/security/sanitization.ts
/**
 * Shared sanitization and injection detection utilities.
 *
 * Framework-agnostic helpers for deep object sanitization and injection pattern detection.
 */

import {
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
} from './input';

// ============================================================================
// Types
// ============================================================================

export interface ValidationOptions {
  /** Enable strict validation (reject unknown fields) */
  strict?: boolean;
  /** Enable input sanitization */
  sanitize?: boolean;
  /** Remove null/undefined values */
  removeEmpty?: boolean;
  /** Maximum object depth */
  maxDepth?: number;
  /** Maximum array length */
  maxArrayLength?: number;
  /** Maximum string length */
  maxStringLength?: number;
}

export interface SanitizationResult {
  /** Whether sanitization was successful */
  valid: boolean;
  /** Sanitized data */
  data: unknown;
  /** Validation errors */
  errors: string[];
  /** Security warnings */
  warnings: string[];
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize object input recursively
 *
 * @param input - The value to sanitize
 * @param options - Validation options controlling sanitization behavior
 * @returns SanitizationResult with sanitized data and any errors/warnings
 */
export function sanitizeObject(
  input: unknown,
  options: ValidationOptions = {},
): SanitizationResult {
  const {
    sanitize = true,
    removeEmpty = true,
    maxDepth = 10,
    maxArrayLength = 1000,
    maxStringLength = 10000,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  let depth = 0;

  function sanitizeValue(value: unknown, path: string[] = []): unknown {
    depth++;
    if (depth > maxDepth) {
      errors.push(`Maximum object depth exceeded at ${path.join('.')}`);
      depth--;
      return null;
    }

    try {
      if (value === null || value === undefined) {
        return removeEmpty ? undefined : value;
      }

      if (typeof value === 'string') {
        if (value.length > maxStringLength) {
          errors.push(
            `String too long at ${path.join('.')}: ${String(value.length)} > ${String(maxStringLength)}`,
          );
          return '';
        }
        return sanitize ? sanitizeString(value) : value;
      }

      if (typeof value === 'number') {
        // Check for NaN, Infinity
        if (!isFinite(value)) {
          warnings.push(`Invalid number at ${path.join('.')}: ${String(value)}`);
          return 0;
        }
        return value;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      if (Array.isArray(value)) {
        if (value.length > maxArrayLength) {
          errors.push(
            `Array too long at ${path.join('.')}: ${String(value.length)} > ${String(maxArrayLength)}`,
          );
          return [];
        }

        const sanitizedArray: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          const sanitizedItem = sanitizeValue(value[i], [...path, i.toString()]);
          if (sanitizedItem !== undefined) {
            sanitizedArray.push(sanitizedItem);
          }
        }
        return sanitizedArray;
      }

      if (typeof value === 'object') {
        const sanitizedObject: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          // Validate key name
          if (!isValidInputKeyName(key)) {
            warnings.push(`Invalid key name at ${path.join('.')}: ${key}`);
            continue;
          }

          const sanitizedVal = sanitizeValue(val, [...path, key]);
          if (sanitizedVal !== undefined) {
            sanitizedObject[key] = sanitizedVal;
          }
        }

        return sanitizedObject;
      }

      // Unknown type - cannot safely convert to string
      warnings.push(`Unknown type at ${path.join('.')}: ${typeof value}`);
      return '';
    } finally {
      depth--;
    }
  }

  const data: unknown = sanitizeValue(input);

  return {
    valid: errors.length === 0,
    data,
    errors,
    warnings,
  };
}

// ============================================================================
// Injection Detection
// ============================================================================

/**
 * Check for injection patterns in input data recursively.
 *
 * @param input - The value to check for injection patterns
 * @param source - The source name for error reporting (e.g., 'body', 'query')
 * @returns Array of detected injection errors
 */
export function getInjectionErrors(input: unknown, source: string): string[] {
  const errors: string[] = [];

  function checkValue(value: unknown, path: string[]): void {
    if (typeof value === 'string') {
      if (detectSQLInjection(value)) {
        errors.push(
          `Potential SQL injection detected in ${source}${path.length > 0 ? '.' + path.join('.') : ''}`,
        );
      }
      if (detectNoSQLInjection(value)) {
        errors.push(
          `Potential NoSQL injection detected in ${source}${path.length > 0 ? '.' + path.join('.') : ''}`,
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      if (detectNoSQLInjection(value)) {
        errors.push(
          `Potential NoSQL injection detected in ${source}${path.length > 0 ? '.' + path.join('.') : ''}`,
        );
      }

      // Recursively check nested objects
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        checkValue(val, [...path, key]);
      }
    }
  }

  checkValue(input, []);
  return errors;
}
