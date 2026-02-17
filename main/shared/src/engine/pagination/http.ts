// main/shared/src/engine/pagination/http.ts
/**
 * Shared HTTP-agnostic pagination query parsing utilities.
 */

import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  PAGINATION_ERROR_TYPES,
  PaginationError,
} from './pagination';

/**
 * Common parameter names for pagination in URLs.
 */
export interface PaginationParamNames {
  page: string;
  limit: string;
  cursor: string;
  sortBy: string;
  sortOrder: string;
}

export const DEFAULT_PAGINATION_PARAMS: PaginationParamNames = {
  page: 'page',
  limit: 'limit',
  cursor: 'cursor',
  sortBy: 'sortBy',
  sortOrder: 'sortOrder',
};

/**
 * Interface for configuration used during parsing.
 */
export interface PaginationParseConfig {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * Parse page number from a query parameter string or array.
 *
 * @param pageParam - The raw page value
 * @returns The parsed page number (minimum 1)
 * @throws PaginationError if the page is not a valid positive integer
 */
export function parsePageParam(pageParam: string | string[] | undefined): number {
  if (pageParam == null) return 1;

  const page = Array.isArray(pageParam) ? (pageParam[0] ?? '') : pageParam;
  const parsed = parseInt(page, 10);

  if (isNaN(parsed) || parsed < 1) {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_PAGE,
      `Invalid page parameter: ${page}. Must be a positive integer.`,
    );
  }

  return parsed;
}

/**
 * Parse limit from a query parameter string or array.
 *
 * @param limitParam - The raw limit value
 * @param config - Configuration with defaults and maximums
 * @returns The parsed limit value
 * @throws PaginationError if the limit is invalid or exceeds maximum
 */
export function parseLimitParam(
  limitParam: string | string[] | undefined,
  config: PaginationParseConfig = {},
): number {
  const { defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = 1000 } = config;

  if (limitParam == null) return defaultLimit;

  const limit = Array.isArray(limitParam) ? (limitParam[0] ?? '') : limitParam;
  const parsed = parseInt(limit, 10);

  if (isNaN(parsed) || parsed < 1) {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_LIMIT,
      `Invalid limit parameter: ${limit}. Must be a positive integer.`,
    );
  }

  if (parsed > maxLimit) {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_LIMIT,
      `Limit parameter ${String(parsed)} exceeds maximum allowed limit of ${String(maxLimit)}.`,
    );
  }

  return parsed;
}

/**
 * Parse sortBy from a query parameter string or array.
 *
 * @param sortByParam - The raw sortBy value
 * @param config - Configuration with default sort field
 * @returns The parsed sort field name
 * @throws PaginationError if the sort field is empty
 */
export function parseSortByParam(
  sortByParam: string | string[] | undefined,
  config: PaginationParseConfig = {},
): string {
  const { defaultSortBy = DEFAULT_SORT_BY } = config;

  if (sortByParam === undefined) return defaultSortBy;

  const sortBy = Array.isArray(sortByParam) ? (sortByParam[0] ?? '') : sortByParam;

  if (sortBy.trim() === '') {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_SORT_FIELD,
      'Invalid sortBy parameter: cannot be empty.',
    );
  }

  return sortBy;
}

/**
 * Parse sortOrder from a query parameter string or array.
 *
 * @param sortOrderParam - The raw sortOrder value
 * @param config - Configuration with default sort order
 * @returns The parsed sort order ('asc' or 'desc')
 * @throws PaginationError if the sort order is not 'asc' or 'desc'
 */
export function parseSortOrderParam(
  sortOrderParam: string | string[] | undefined,
  config: PaginationParseConfig = {},
): 'asc' | 'desc' {
  const { defaultSortOrder = DEFAULT_SORT_ORDER } = config;

  if (sortOrderParam == null) return defaultSortOrder;

  const sortOrder = Array.isArray(sortOrderParam) ? (sortOrderParam[0] ?? '') : sortOrderParam;

  if (sortOrder === 'asc' || sortOrder === 'desc') {
    return sortOrder;
  }

  throw new PaginationError(
    PAGINATION_ERROR_TYPES.INVALID_SORT_ORDER,
    `Invalid sortOrder parameter: ${sortOrder}. Must be 'asc' or 'desc'.`,
  );
}

/**
 * Extract a single parameter value from a record of query parameters.
 */
export function getQueryParam(
  query: Record<string, unknown>,
  key: string,
): string | string[] | undefined {
  if (key === '') return undefined;
  const value = query[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value;
  }
  return undefined;
}
