// main/apps/server/src/http/pagination/middleware.ts
/**
 * Pagination middleware factory for Fastify.
 * Parses query parameters and attaches pagination context to requests.
 */

import {
  DEFAULT_PAGINATION,
  DEFAULT_SORT_BY,
  getQueryParam,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
  SORT_ORDER,
} from '@bslt/shared';

import { createPaginationHelpers } from './helpers';

import type { CursorPaginationOptions } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PaginationContext, PaginationMiddlewareOptions, PaginationRequest } from './types';

/**
 * Default pagination middleware options
 */
const DEFAULT_OPTIONS: Required<PaginationMiddlewareOptions> = {
  defaultLimit: DEFAULT_PAGINATION.LIMIT,
  maxLimit: 100, // Intentionally lower than DEFAULT_PAGINATION.MAX_LIMIT for HTTP safety
  defaultSortBy: DEFAULT_SORT_BY,
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

    // Determine pagination type
    const cursorParam = getQueryParam(query, paramNames.cursor || 'cursor');
    const pageParam = getQueryParam(query, paramNames.page || 'page');
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

      const limit = parseLimitParam(getQueryParam(query, paramNames.limit || 'limit'), config);
      const sortBy = parseSortByParam(getQueryParam(query, paramNames.sortBy || 'sortBy'), config);
      const sortOrder = parseSortOrderParam(
        getQueryParam(query, paramNames.sortOrder || 'sortOrder'),
        config,
      );

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
      const page = parsePageParam(pageParam);
      const limit = parseLimitParam(getQueryParam(query, paramNames.limit || 'limit'), config);
      const sortBy = parseSortByParam(getQueryParam(query, paramNames.sortBy || 'sortBy'), config);
      const sortOrder = parseSortOrderParam(
        getQueryParam(query, paramNames.sortOrder || 'sortOrder'),
        config,
      );

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
