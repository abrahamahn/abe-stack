// apps/server/src/shared/validationError.ts
/**
 * Validation Error Formatting
 *
 * Re-exports validation error utilities from @abe-stack/core.
 * These types and functions define the API contract for validation error responses.
 */

export {
  formatValidationErrors,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
  type ZodIssueMinimal,
} from '@abe-stack/core';
