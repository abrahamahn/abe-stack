// shared/core/src/infrastructure/errors/validation.ts
/**
 * Validation Error
 *
 * Error type for field-level validation failures.
 * Includes field-specific error messages for form handling.
 */

import { BadRequestError } from './http';

/**
 * Validation error with field-level details
 *
 * @example
 * throw new ValidationError('Validation failed', {
 *   email: ['Invalid email format'],
 *   password: ['Must be at least 8 characters', 'Must contain a number']
 * })
 */
export class ValidationError extends BadRequestError {
  constructor(
    message: string,
    public readonly fields: Record<string, string[]>,
  ) {
    super(message, 'VALIDATION_ERROR', { fields });
  }
}
