// src/apps/server/src/http/pagination/middleware.ts
/**
 * Pagination middleware factory for Fastify.
 * Parses query parameters and attaches pagination context to requests.
 */

import { DEFAULT_PAGINATION, PAGINATION_ERROR_TYPES, PaginationError, SORT_ORDER } from '@abe-stack/shared';

import { createPaginationHelpers } from './helpers';

import type { PaginationContext, PaginationMiddlewareOptions, PaginationRequest } from './types';
import type { CursorPaginationOptions } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
/**
 * Default pagination middleware options
 */
const DEFAULT_OPTIONS: Required<PaginationMiddlewareOptions> = {
  defaultLimit: DEFAULT_PAGINATION.LIMIT,
  maxLimit: 100, // Intentionally lower than DEFAULT_PAGINATION.MAX_LIMIT for HTTP safety
  defaultSortBy: 'createdAt',
  defaultSortOrder: SORT_ORDER.DESC,
  enableCursorPagination: true,
  paramNames: {
    page: 'page',
    limit: 'limit',
    cursor: 'cursor',
    sortBy: 'sortBy',
    sortOrder: 'sortOrder',
  },
};

/**
 * Pagination middleware factory
 * Parses query parameters and attaches pagination context to request
 *
 * @param options - Pagination middleware configuration
 * @returns Fastify preHandler middleware function
 */
export function createPaginationMiddleware(options: PaginationMiddlewareOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function paginationMiddleware(request: FastifyRequest, _reply: FastifyReply): void {
    const query =
      typeof request.query === 'object' && request.query !== null
        ? (request.query as Record<string, unknown>)
        : {};
    const paramNames = config.paramNames;

    const getParam = (key: string | undefined): string | string[] | undefined => {
      if (key == null || key === '') return undefined;
      const value = query[key];
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
        return value;
      }
      return undefined;
    };

    // Determine pagination type
    const cursorParam = getParam(paramNames.cursor);
    const pageParam = getParam(paramNames.page);
    const hasCursor = cursorParam !== undefined;

    const paginationType: 'offset' | 'cursor' =
      hasCursor && config.enableCursorPagination ? 'cursor' : 'offset';

    // Attach pagination context to request
    const paginationContext: PaginationContext = {
      type: paginationType,
      helpers: createPaginationHelpers(),
    };

    if (paginationType === 'cursor') {
      const cursor = Array.isArray(cursorParam) ? cursorParam[0] : cursorParam;

      const limit = parseLimit(getParam(paramNames.limit), config);
      const sortBy = parseSortBy(getParam(paramNames.sortBy), config);
      const sortOrder = parseSortOrder(getParam(paramNames.sortOrder), config);

      const cursorOptions: CursorPaginationOptions = {
        limit,
        sortBy,
        sortOrder,
      };
      if (cursor !== undefined) {
        cursorOptions.cursor = cursor;
      }
      paginationContext.cursor = cursorOptions;
    } else {
      const page = parsePage(pageParam);
      const limit = parseLimit(getParam(paramNames.limit), config);
      const sortBy = parseSortBy(getParam(paramNames.sortBy), config);
      const sortOrder = parseSortOrder(getParam(paramNames.sortOrder), config);

      paginationContext.offset = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
    }

    (request as PaginationRequest).pagination = paginationContext;
  };
}

/**
 * Parse page number from query parameter
 *
 * @param pageParam - The raw page query parameter
 * @returns The parsed page number (minimum 1)
 * @throws PaginationError if the page is not a valid positive integer
 */
function parsePage(pageParam: string | string[] | undefined): number {
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
 * Parse limit from query parameter
 *
 * @param limitParam - The raw limit query parameter
 * @param config - The middleware configuration with defaults and max limit
 * @returns The parsed limit value
 * @throws PaginationError if the limit is invalid or exceeds maximum
 */
function parseLimit(
  limitParam: string | string[] | undefined,
  config: Required<PaginationMiddlewareOptions>,
): number {
  if (limitParam == null) return config.defaultLimit;

  const limit = Array.isArray(limitParam) ? (limitParam[0] ?? '') : limitParam;
  const parsed = parseInt(limit, 10);

  if (isNaN(parsed) || parsed < 1) {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_LIMIT,
      `Invalid limit parameter: ${limit}. Must be a positive integer.`,
    );
  }

  if (parsed > config.maxLimit) {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_LIMIT,
      `Limit parameter ${String(parsed)} exceeds maximum allowed limit of ${String(config.maxLimit)}.`,
    );
  }

  return parsed;
}

/**
 * Parse sortBy from query parameter
 *
 * @param sortByParam - The raw sortBy query parameter
 * @param config - The middleware configuration with default sort field
 * @returns The parsed sort field name
 * @throws PaginationError if the sort field is empty
 */
function parseSortBy(
  sortByParam: string | string[] | undefined,
  config: Required<PaginationMiddlewareOptions>,
): string {
  if (typeof sortByParam === 'undefined') return config.defaultSortBy;

  const sortBy = Array.isArray(sortByParam) ? (sortByParam[0] ?? '') : sortByParam;

  // Basic validation - should be a non-empty string
  if (sortBy.trim() === '') {
    throw new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_SORT_FIELD,
      'Invalid sortBy parameter: cannot be empty.',
    );
  }

  return sortBy;
}

/**
 * Parse sortOrder from query parameter
 *
 * @param sortOrderParam - The raw sortOrder query parameter
 * @param config - The middleware configuration with default sort order
 * @returns The parsed sort order ('asc' or 'desc')
 * @throws PaginationError if the sort order is not 'asc' or 'desc'
 */
function parseSortOrder(
  sortOrderParam: string | string[] | undefined,
  config: Required<PaginationMiddlewareOptions>,
): typeof SORT_ORDER.ASC | typeof SORT_ORDER.DESC {
  if (sortOrderParam == null) return config.defaultSortOrder;

  const sortOrder = Array.isArray(sortOrderParam) ? (sortOrderParam[0] ?? '') : sortOrderParam;

  if (sortOrder === SORT_ORDER.ASC) return SORT_ORDER.ASC;
  if (sortOrder === SORT_ORDER.DESC) return SORT_ORDER.DESC;

  throw new PaginationError(
    PAGINATION_ERROR_TYPES.INVALID_SORT_ORDER,
    `Invalid sortOrder parameter: ${sortOrder}. Must be 'asc' or 'desc'.`,
  );
}
