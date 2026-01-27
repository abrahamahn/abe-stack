// packages/core/src/infrastructure/errors/validationError.ts
/**
 * Validation Error Formatting
 *
 * Standardized validation error responses that include all validation errors,
 * not just the first one. Compatible with Zod validation results.
 */

/**
 * Minimal Zod issue interface for compatibility without direct Zod dependency
 * Updated for Zod v4 where path can include symbols (PropertyKey)
 */
export interface ZodIssueMinimal {
  path: PropertyKey[];
  message: string;
  code: string;
}

/**
 * Individual validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Standardized validation error response structure
 */
export interface ValidationErrorResponse {
  ok: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationErrorDetail[];
  };
}

/**
 * Formats Zod validation issues into a standardized error response.
 *
 * This function transforms all validation errors into a consistent format
 * that includes field paths, messages, and error codes for each issue.
 *
 * @param issues - Array of Zod validation issues
 * @returns Formatted validation error response with all errors
 *
 * @example
 * ```typescript
 * const parsed = schema.safeParse(req.body);
 * if (!parsed.success) {
 *   return reply.status(400).send(formatValidationErrors(parsed.error.issues));
 * }
 * ```
 */
export function formatValidationErrors(issues: ZodIssueMinimal[]): ValidationErrorResponse {
  return {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: issues.map((issue) => ({
        field: issue.path.map((p) => String(p)).join('.'),
        message: issue.message,
        code: issue.code,
      })),
    },
  };
}
