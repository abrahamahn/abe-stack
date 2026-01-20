// packages/core/src/domains/pagination/error.ts

/**
 * Pagination-specific error types
 */
export const PAGINATION_ERROR_TYPES = {
  INVALID_CURSOR: 'INVALID_CURSOR',
  CURSOR_SORT_MISMATCH: 'CURSOR_SORT_MISMATCH',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
} as const;

export type PaginationErrorType =
  (typeof PAGINATION_ERROR_TYPES)[keyof typeof PAGINATION_ERROR_TYPES];

/**
 * Error class for pagination-related errors
 */
export class PaginationError extends Error {
  public readonly type: PaginationErrorType;
  public readonly details?: unknown;

  constructor(type: PaginationErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'PaginationError';
    this.type = type;
    this.details = details;
  }

  /**
   * Check if an error is a PaginationError
   */
  static isPaginationError(error: unknown): error is PaginationError {
    return error instanceof PaginationError;
  }

  /**
   * Check if an error is a specific type of PaginationError
   */
  static isType(error: unknown, type: PaginationErrorType): error is PaginationError {
    return PaginationError.isPaginationError(error) && error.type === type;
  }
}
