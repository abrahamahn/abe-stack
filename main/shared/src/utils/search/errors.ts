// main/shared/src/utils/search/errors.ts
/**
 * Search-Specific Errors
 *
 * Custom error classes for search and filtering operations.
 */

import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../errors/base';

// ============================================================================
// Search Error Types
// ============================================================================

/**
 * Search error type constants.
 */
export const SEARCH_ERROR_TYPES = {
  InvalidQuery: 'INVALID_QUERY',
  InvalidFilter: 'INVALID_FILTER',
  InvalidOperator: 'INVALID_OPERATOR',
  InvalidField: 'INVALID_FIELD',
  InvalidSort: 'INVALID_SORT',
  InvalidPagination: 'INVALID_PAGINATION',
  InvalidCursor: 'INVALID_CURSOR',
  ProviderError: 'PROVIDER_ERROR',
  ProviderUnavailable: 'PROVIDER_UNAVAILABLE',
  UnsupportedOperator: 'UNSUPPORTED_OPERATOR',
  QueryTooComplex: 'QUERY_TOO_COMPLEX',
  SearchTimeout: 'SEARCH_TIMEOUT',
} as const;

export type SearchErrorType = (typeof SEARCH_ERROR_TYPES)[keyof typeof SEARCH_ERROR_TYPES];

// ============================================================================
// Base Search Error
// ============================================================================

/**
 * Base error class for search operations.
 */
export class SearchError extends AppError {
  constructor(
    message: string,
    public readonly errorType: SearchErrorType,
    statusCode: number = HTTP_STATUS.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super(message, statusCode, errorType, details);
    this.name = 'SearchError';
  }
}

// ============================================================================
// Specific Search Errors
// ============================================================================

/**
 * Invalid search query structure.
 */
export class InvalidQueryError extends SearchError {
  constructor(message = 'Invalid search query', details?: Record<string, unknown>) {
    super(message, SEARCH_ERROR_TYPES.InvalidQuery, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'InvalidQueryError';
  }
}

/**
 * Invalid filter condition.
 */
export class InvalidFilterError extends SearchError {
  constructor(
    message = 'Invalid filter condition',
    public readonly field?: string,
    public readonly operator?: string,
    details?: Record<string, unknown>,
  ) {
    super(message, SEARCH_ERROR_TYPES.InvalidFilter, HTTP_STATUS.BAD_REQUEST, {
      field,
      operator,
      ...details,
    });
    this.name = 'InvalidFilterError';
  }
}

/**
 * Unknown or unsupported filter operator.
 */
export class InvalidOperatorError extends SearchError {
  constructor(operator: string, supportedOperators?: string[], details?: Record<string, unknown>) {
    super(
      `Unknown filter operator: ${operator}`,
      SEARCH_ERROR_TYPES.InvalidOperator,
      HTTP_STATUS.BAD_REQUEST,
      { operator, supportedOperators, ...details },
    );
    this.name = 'InvalidOperatorError';
  }
}

/**
 * Invalid or non-existent field reference.
 */
export class InvalidFieldError extends SearchError {
  constructor(field: string, allowedFields?: string[], details?: Record<string, unknown>) {
    super(`Invalid field: ${field}`, SEARCH_ERROR_TYPES.InvalidField, HTTP_STATUS.BAD_REQUEST, {
      field,
      allowedFields,
      ...details,
    });
    this.name = 'InvalidFieldError';
  }
}

/**
 * Invalid sort configuration.
 */
export class InvalidSortError extends SearchError {
  constructor(message = 'Invalid sort configuration', details?: Record<string, unknown>) {
    super(message, SEARCH_ERROR_TYPES.InvalidSort, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'InvalidSortError';
  }
}

/**
 * Invalid pagination parameters.
 */
export class InvalidPaginationError extends SearchError {
  constructor(message = 'Invalid pagination parameters', details?: Record<string, unknown>) {
    super(message, SEARCH_ERROR_TYPES.InvalidPagination, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'InvalidPaginationError';
  }
}

/**
 * Invalid or expired cursor.
 */
export class InvalidCursorError extends SearchError {
  constructor(message = 'Invalid or expired cursor', details?: Record<string, unknown>) {
    super(message, SEARCH_ERROR_TYPES.InvalidCursor, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'InvalidCursorError';
  }
}

/**
 * Search provider encountered an error.
 */
export class SearchProviderError extends SearchError {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly originalError?: Error,
    details?: Record<string, unknown>,
  ) {
    super(message, SEARCH_ERROR_TYPES.ProviderError, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      providerName,
      ...details,
    });
    this.name = 'SearchProviderError';
  }
}

/**
 * Search provider is unavailable.
 */
export class SearchProviderUnavailableError extends SearchError {
  constructor(
    providerName: string,
    message = `Search provider '${providerName}' is unavailable`,
    details?: Record<string, unknown>,
  ) {
    super(message, SEARCH_ERROR_TYPES.ProviderUnavailable, HTTP_STATUS.SERVICE_UNAVAILABLE, {
      providerName,
      ...details,
    });
    this.name = 'SearchProviderUnavailableError';
  }
}

/**
 * Operator not supported by the current provider.
 */
export class UnsupportedOperatorError extends SearchError {
  constructor(
    operator: string,
    providerName: string,
    supportedOperators?: string[],
    details?: Record<string, unknown>,
  ) {
    super(
      `Operator '${operator}' is not supported by provider '${providerName}'`,
      SEARCH_ERROR_TYPES.UnsupportedOperator,
      HTTP_STATUS.BAD_REQUEST,
      { operator, providerName, supportedOperators, ...details },
    );
    this.name = 'UnsupportedOperatorError';
  }
}

/**
 * Query is too complex (too many conditions, too deep nesting, etc.).
 */
export class QueryTooComplexError extends SearchError {
  constructor(
    message = 'Query is too complex',
    public readonly maxDepth?: number,
    public readonly maxConditions?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, SEARCH_ERROR_TYPES.QueryTooComplex, HTTP_STATUS.BAD_REQUEST, {
      maxDepth,
      maxConditions,
      ...details,
    });
    this.name = 'QueryTooComplexError';
  }
}

/**
 * Search query timed out.
 */
export class SearchTimeoutError extends SearchError {
  constructor(
    public readonly timeoutMs: number,
    message = `Search query timed out after ${String(timeoutMs)}ms`,
    details?: Record<string, unknown>,
  ) {
    super(
      message,
      SEARCH_ERROR_TYPES.SearchTimeout,
      504, // Gateway Timeout
      { timeoutMs, ...details },
    );
    this.name = 'SearchTimeoutError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is a SearchError.
 */
export function isSearchError(error: unknown): error is SearchError {
  return error instanceof SearchError;
}

/**
 * Check if an error is an InvalidQueryError.
 */
export function isInvalidQueryError(error: unknown): error is InvalidQueryError {
  return error instanceof InvalidQueryError;
}

/**
 * Check if an error is an InvalidFilterError.
 */
export function isInvalidFilterError(error: unknown): error is InvalidFilterError {
  return error instanceof InvalidFilterError;
}

/**
 * Check if an error is a SearchProviderError.
 */
export function isSearchProviderError(error: unknown): error is SearchProviderError {
  return error instanceof SearchProviderError;
}

/**
 * Check if an error is a SearchTimeoutError.
 */
export function isSearchTimeoutError(error: unknown): error is SearchTimeoutError {
  return error instanceof SearchTimeoutError;
}
