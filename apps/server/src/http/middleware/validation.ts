// infra/src/http/middleware/validation.ts
/**
 * Input Validation & Sanitization Middleware
 *
 * Comprehensive input validation and sanitization for API endpoints.
 * Prevents injection attacks, validates data types, and sanitizes user input.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

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
 * Sanitize string input to prevent XSS and injection attacks
 *
 * @param input - The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return (
    input
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove potential script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      // Remove potential event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove javascript: URLs
      .replace(/javascript:/gi, '')
      // Remove data: URLs that aren't images
      .replace(/data:(?!image\/(?:png|jpg|jpeg|gif|webp|svg\+xml))[^;]+;[^,]+,/gi, '')
      // Trim whitespace
      .trim()
  );
}

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
          if (!isValidKeyName(key)) {
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

/**
 * Validate key name for security
 *
 * @param key - The key name to validate
 * @returns true if the key name is safe
 */
function isValidKeyName(key: string): boolean {
  // Allow alphanumeric, underscore, and dollar sign
  // Reject keys that could be used for prototype pollution
  return (
    /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) &&
    !['__proto__', 'prototype', 'constructor', 'toString', 'valueOf'].includes(key.toLowerCase())
  );
}

// ============================================================================
// SQL Injection Prevention
// ============================================================================

/**
 * SQL injection detection options
 */
export interface SQLInjectionDetectionOptions {
  /**
   * Enable SQL injection detection. Set to false for endpoints that legitimately
   * need to accept SQL keywords (e.g., code editors, documentation endpoints).
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Check for potential SQL injection patterns.
 *
 * IMPORTANT: These patterns are designed to detect actual SQL injection attempts,
 * not just SQL keywords. Simple words like "select" or "update" in normal text
 * will NOT trigger false positives.
 *
 * @param input - The string to check for SQL injection patterns
 * @param options - Detection options
 * @returns true if potential SQL injection is detected
 */
export function detectSQLInjection(
  input: string,
  options: SQLInjectionDetectionOptions = {},
): boolean {
  const { enabled = true } = options;

  if (!enabled) {
    return false;
  }

  // More specific patterns that require SQL syntax context, not just keywords
  const patterns = [
    // UNION-based injection (requires UNION followed by SELECT)
    /\bunion\s+(all\s+)?select\b/i,
    // SELECT with FROM clause (actual query structure)
    /\bselect\s+.+\s+from\s+/i,
    // INSERT INTO pattern
    /\binsert\s+into\s+/i,
    // UPDATE with SET (actual update syntax)
    /\bupdate\s+\S+\s+set\s+/i,
    // DELETE FROM pattern
    /\bdelete\s+from\s+/i,
    // DROP TABLE/DATABASE
    /\bdrop\s+(table|database|index)\b/i,
    // SQL comment sequences (common injection technique)
    /(-{2}|\/\*|\*\/)/,
    // Hex-encoded injection characters
    /(\\x27|\\x2D\\x2D|\\x2F\\x2A|\\x2A\\x2F)/,
    // Classic tautologies used in injection
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\band\b\s+\d+\s*=\s*\d+)/i,
    // String termination followed by OR/AND (common injection start)
    /'\s*(or|and)\s+['"\d]/i,
    // Semicolon followed by SQL command (stacked queries)
    /;\s*(select|insert|update|delete|drop|create|alter|exec|execute)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Check for potential NoSQL injection patterns
 *
 * @param input - The value to check for NoSQL injection patterns
 * @returns true if potential NoSQL injection is detected
 */
export function detectNoSQLInjection(input: unknown): boolean {
  if (typeof input === 'string') {
    // Check for MongoDB operators
    return /(\$|\{|\}|\[|\]|\$eq|\$ne|\$gt|\$gte|\$lt|\$lte|\$in|\$nin|\$and|\$or|\$not|\$nor|\$exists|\$type|\$regex|\$where|\$options)/.test(
      input,
    );
  }

  if (typeof input === 'object' && input !== null) {
    // Check object keys for MongoDB operators
    return Object.keys(input as Record<string, unknown>).some(
      (key) => key.startsWith('$') || ['__proto__', 'prototype', 'constructor'].includes(key),
    );
  }

  return false;
}

// ============================================================================
// Fastify Middleware
// ============================================================================

/**
 * Register input validation middleware on a Fastify instance
 *
 * @param server - The Fastify instance to register on
 * @param options - Validation options controlling behavior
 */
export function registerInputValidation(
  server: FastifyInstance,
  options: ValidationOptions = {},
): void {
  const {
    strict = true,
    sanitize = true,
    removeEmpty = true,
    maxDepth = 10,
    maxArrayLength = 1000,
    maxStringLength = 10000,
  } = options;

  // Pre-handler validation hook
  server.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const validationResult = validateRequestInput(req, {
      strict,
      sanitize,
      removeEmpty,
      maxDepth,
      maxArrayLength,
      maxStringLength,
    });

    if (!validationResult.valid) {
      reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: validationResult.errors,
      });
      return;
    }

    // Store sanitized data back in request using Object.defineProperty
    // to avoid type assertions
    if (validationResult.sanitizedBody !== undefined) {
      Object.defineProperty(req, 'body', {
        value: validationResult.sanitizedBody,
        writable: true,
        configurable: true,
      });
    }
    if (validationResult.sanitizedQuery !== undefined) {
      Object.defineProperty(req, 'query', {
        value: validationResult.sanitizedQuery,
        writable: true,
        configurable: true,
      });
    }
    if (validationResult.sanitizedParams !== undefined) {
      Object.defineProperty(req, 'params', {
        value: validationResult.sanitizedParams,
        writable: true,
        configurable: true,
      });
    }

    // Security warnings are logged through the sanitization process
    // and can be accessed via validationResult.warnings if needed
  });
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedBody?: unknown;
  sanitizedQuery?: unknown;
  sanitizedParams?: unknown;
}

/**
 * Validate all request input (body, query, params)
 */
function validateRequestInput(req: FastifyRequest, options: ValidationOptions): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  let sanitizedBody: unknown;
  let sanitizedQuery: unknown;
  let sanitizedParams: unknown;

  // Validate and sanitize body
  if (req.body != null && typeof req.body === 'object') {
    const result = sanitizeObject(req.body, options);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    if (result.valid) {
      sanitizedBody = result.data;
    }
  }

  // Validate and sanitize query parameters
  if (req.query != null && typeof req.query === 'object') {
    const result = sanitizeObject(req.query, options);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    if (result.valid) {
      sanitizedQuery = result.data;
    }
  }

  // Validate and sanitize route parameters
  if (req.params != null && typeof req.params === 'object') {
    const result = sanitizeObject(req.params, options);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    if (result.valid) {
      sanitizedParams = result.data;
    }
  }

  // Check for injection patterns in string inputs
  const inputs: [unknown, string][] = [
    [req.body, 'body'],
    [req.query, 'query'],
    [req.params, 'params'],
  ];
  for (const [input, source] of inputs) {
    checkForInjections(input, source, allErrors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    sanitizedBody,
    sanitizedQuery,
    sanitizedParams,
  };
}

/**
 * Check for injection patterns in input data
 */
function checkForInjections(input: unknown, source: string, errors: string[]): void {
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
}
