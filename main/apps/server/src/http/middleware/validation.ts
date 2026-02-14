// main/apps/server/src/http/middleware/validation.ts
/**
 * Input Validation & Sanitization Middleware
 *
 * Comprehensive input validation and sanitization for API endpoints.
 * Prevents injection attacks, validates data types, and sanitizes user input.
 */

import {
  HTTP_STATUS,
  detectNoSQLInjection,
  detectSQLInjection,
  sanitizeString,
  getInjectionErrors,
  sanitizeObject,
  type SanitizationResult,
  type ValidationOptions,
  type SQLInjectionDetectionOptions,
} from '@abe-stack/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export type { ValidationOptions, SanitizationResult };

// ============================================================================
// Input Sanitization
// ============================================================================

export { sanitizeString, sanitizeObject };

// ============================================================================
// SQL Injection Prevention
// ============================================================================

export type { SQLInjectionDetectionOptions };

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
export { detectSQLInjection };

/**
 * Check for potential NoSQL injection patterns
 *
 * @param input - The value to check for NoSQL injection patterns
 * @returns true if potential NoSQL injection is detected
 */
export { detectNoSQLInjection, getInjectionErrors };

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
      reply.status(HTTP_STATUS.BAD_REQUEST).send({
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
    allErrors.push(...getInjectionErrors(input, source));
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
