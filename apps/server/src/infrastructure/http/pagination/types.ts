// apps/server/src/infrastructure/http/pagination/types.ts
import type {
  CursorPaginationOptions,
  CursorPaginatedResult,
  PaginatedResult,
  PaginationOptions,
  SortOrder,
} from '@abe-stack/core';
import type { FastifyRequest } from 'fastify';

/**
 * Pagination middleware configuration options
 */
export interface PaginationMiddlewareOptions {
  /** Default page size for offset pagination */
  defaultLimit?: number;
  /** Maximum allowed page size */
  maxLimit?: number;
  /** Default sort field */
  defaultSortBy?: string;
  /** Default sort order */
  defaultSortOrder?: SortOrder;
  /** Whether to enable cursor pagination */
  enableCursorPagination?: boolean;
  /** Query parameter names */
  paramNames?: {
    page?: string;
    limit?: string;
    cursor?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

/**
 * Pagination context attached to request
 */
export interface PaginationContext {
  /** Pagination type */
  type: 'offset' | 'cursor';
  /** Offset pagination options (if type === 'offset') */
  offset?: PaginationOptions;
  /** Cursor pagination options (if type === 'cursor') */
  cursor?: CursorPaginationOptions;
  /** Helper functions for creating paginated responses */
  helpers: PaginationHelpers;
}

/**
 * Helper functions for creating paginated responses
 */
export interface PaginationHelpers {
  /**
   * Create offset-based paginated result
   */
  createOffsetResult: <T>(
    data: T[],
    total: number,
    options: PaginationOptions,
  ) => PaginatedResult<T>;

  /**
   * Create cursor-based paginated result
   */
  createCursorResult: <T>(
    data: T[],
    nextCursor: string | null,
    hasNext: boolean,
    limit: number,
  ) => CursorPaginatedResult<T>;

  /**
   * Apply offset pagination to database query
   */
  applyOffsetPagination: <T>(
    queryBuilder: OffsetPaginationQueryBuilder<T>,
    options: PaginationOptions,
  ) => Promise<{ data: T[]; total: number }>;

  /**
   * Apply cursor pagination to database query
   */
  applyCursorPagination: <T extends Record<string, unknown>>(
    queryBuilder: CursorPaginationQueryBuilder<T>,
    options: CursorPaginationOptions,
    sortBy: string,
    tieBreakerField?: string,
  ) => Promise<{ data: T[]; hasNext: boolean; nextCursor: string | null }>;
}

export type CountResult =
  | number
  | { count?: number | string }
  | Array<{ count?: number | string }>
  | { count: number | string };

export type OffsetPaginationQueryBuilder<T> = {
  clone?: () => OffsetPaginationQueryBuilder<T>;
  orderBy: (
    sortBy: string,
    sortOrder?: PaginationOptions['sortOrder'],
  ) => OffsetPaginationQueryBuilder<T>;
  count: () => PromiseLike<CountResult>;
  offset: (value: number) => OffsetPaginationQueryBuilder<T>;
  limit: (value: number) => OffsetPaginationQueryBuilder<T> | PromiseLike<T[]>;
  then?: PromiseLike<T[]>['then'];
};

export type CursorPaginationQueryBuilder<T> = {
  clone?: () => CursorPaginationQueryBuilder<T>;
  whereRaw: (clause: string, params: unknown[]) => CursorPaginationQueryBuilder<T>;
  orderByRaw: (clause: string) => CursorPaginationQueryBuilder<T>;
  limit: (value: number) => CursorPaginationQueryBuilder<T> | PromiseLike<T[]>;
  then?: PromiseLike<T[]>['then'];
};

/**
 * Extended Fastify request with pagination context
 */
export interface PaginationRequest extends FastifyRequest {
  pagination: PaginationContext;
}
