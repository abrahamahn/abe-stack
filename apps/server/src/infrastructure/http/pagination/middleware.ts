// apps/server/src/infrastructure/http/pagination/middleware.ts
import { PAGINATION_ERROR_TYPES, PaginationError, SORT_ORDER } from '@abe-stack/core';

import { createPaginationHelpers } from './helpers';

import type { PaginationContext, PaginationMiddlewareOptions, PaginationRequest } from './types';
import type { CursorPaginationOptions, PaginationOptions } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
/**
 * Default pagination middleware options
 */
const DEFAULT_OPTIONS: Required<PaginationMiddlewareOptions> = {
  defaultLimit: 50,
  maxLimit: 100,
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

    let paginationType: 'offset' | 'cursor' = 'offset';
    let offsetOptions: PaginationOptions | undefined;
    let cursorOptions: CursorPaginationOptions | undefined;

    if (hasCursor && config.enableCursorPagination) {
      paginationType = 'cursor';

      const cursor = Array.isArray(cursorParam) ? cursorParam[0] : cursorParam;

      const limit = parseLimit(getParam(paramNames.limit), config);
      const sortBy = parseSortBy(getParam(paramNames.sortBy), config);
      const sortOrder = parseSortOrder(getParam(paramNames.sortOrder), config);

      cursorOptions = {
        limit,
        sortBy,
        sortOrder,
      };
      if (cursor !== undefined) {
        cursorOptions.cursor = cursor;
      }
    } else {
      paginationType = 'offset';

      const page = parsePage(pageParam);
      const limit = parseLimit(getParam(paramNames.limit), config);
      const sortBy = parseSortBy(getParam(paramNames.sortBy), config);
      const sortOrder = parseSortOrder(getParam(paramNames.sortOrder), config);

      offsetOptions = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
    }

    // Attach pagination context to request
    const paginationContext: PaginationContext = {
      type: paginationType,
      helpers: createPaginationHelpers(),
    };
    if (offsetOptions !== undefined) {
      paginationContext.offset = offsetOptions;
    }
    if (cursorOptions !== undefined) {
      paginationContext.cursor = cursorOptions;
    }

    (request as PaginationRequest).pagination = paginationContext;
  };
}

/**
 * Parse page number from query parameter
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

  // TODO: Add allowlist validation for security
  return sortBy;
}

/**
 * Parse sortOrder from query parameter
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
