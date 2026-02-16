// main/shared/src/utils/errors/base.ts
/**
 * Base Error Classes (L1)
 *
 * Foundation error types that only depend on L0 constants.
 * Domain-specific errors (BadRequestError, etc.) remain in core/errors.ts (L2).
 */

import { ERROR_CODES, HTTP_STATUS } from '../../primitives/constants';

/**
 * Minimal validation issue shape for error formatting.
 * Structurally compatible with Zod's ZodIssue for backward compatibility.
 */
export interface ValidationIssue {
  /** Path segments to the invalid field */
  path: ReadonlyArray<string | number>;
  /** Human-readable error message */
  message: string;
  /** Machine-readable error code */
  code: string;
}

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base abstract error class for the clean architecture.
 */
export abstract class BaseError extends Error {
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Base application error class
 * All custom errors should extend this.
 *
 * The `code` parameter accepts any string to support domain-specific error codes.
 * Standard codes are available via the `ERROR_CODES` constant and `ErrorCode` type.
 */
export class AppError extends BaseError {
  public readonly expose: boolean;

  constructor(
    message: string,
    public readonly statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public readonly code: string = ERROR_CODES.INTERNAL_ERROR,
    public readonly details?: Record<string, unknown>,
    expose?: boolean,
  ) {
    super(message);
    this.expose = expose ?? statusCode < 500;
  }

  toJSON(): {
    ok: false;
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown> | undefined;
    };
  } {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}
