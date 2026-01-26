/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/http/pagination/__tests__/middleware.test.ts
import { PAGINATION_ERROR_TYPES, PaginationError } from '@abe-stack/core';
import { describe, expect, it } from 'vitest';

import { createPaginationMiddleware } from '../middleware';

import type { FastifyReply } from 'fastify';
import type { PaginationRequest } from '../types';

describe('Pagination Middleware', () => {
  const createMockRequest = (query: Record<string, string | string[]> = {}) => ({
    query,
  });

  const createMockReply = () => ({});

  it('should parse offset pagination correctly', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({
      page: '2',
      limit: '25',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.type).toBe('offset');
    expect(typedReq.pagination.offset).toEqual({
      page: 2,
      limit: 25,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('should parse cursor pagination correctly', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({
      cursor: 'test-cursor',
      limit: '10',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.type).toBe('cursor');
    expect(typedReq.pagination.cursor).toEqual({
      cursor: 'test-cursor',
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('should use defaults when parameters are missing', () => {
    const middleware = createPaginationMiddleware({
      defaultLimit: 20,
      defaultSortBy: 'id',
      defaultSortOrder: 'asc',
    });

    const req = createMockRequest({});
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.type).toBe('offset');
    expect(typedReq.pagination.offset).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'id',
      sortOrder: 'asc',
    });
  });

  it('should prefer cursor pagination when cursor is present', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({
      page: '2',
      cursor: 'test-cursor',
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.type).toBe('cursor');
  });

  it('should handle array query parameters', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({
      page: ['3'],
      limit: ['30'],
      sortBy: ['updatedAt'],
      sortOrder: ['desc'],
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.offset).toEqual({
      page: 3,
      limit: 30,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  });

  it('should throw error for invalid page number', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({ page: '0' });
    const reply = createMockReply();

    expect(() => {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    }).toThrow(PaginationError);

    try {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_PAGE);
      } else {
        throw error;
      }
    }
  });

  it('should throw error for invalid limit', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({ limit: '0' });
    const reply = createMockReply();

    expect(() => {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    }).toThrow(PaginationError);

    try {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_LIMIT);
      } else {
        throw error;
      }
    }
  });

  it('should throw error for limit exceeding maximum', () => {
    const middleware = createPaginationMiddleware({ maxLimit: 100 });

    const req = createMockRequest({ limit: '200' });
    const reply = createMockReply();

    expect(() => {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    }).toThrow(PaginationError);

    try {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_LIMIT);
      } else {
        throw error;
      }
    }
  });

  it('should throw error for invalid sort order', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({ sortOrder: 'invalid' });
    const reply = createMockReply();

    expect(() => {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    }).toThrow(PaginationError);

    try {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_SORT_ORDER);
      } else {
        throw error;
      }
    }
  });

  it('should throw error for empty sort field', () => {
    const middleware = createPaginationMiddleware();

    const req = createMockRequest({ sortBy: '' });
    const reply = createMockReply();

    expect(() => {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    }).toThrow(PaginationError);

    try {
      middleware(req as unknown as PaginationRequest, reply as unknown as FastifyReply);
    } catch (error) {
      if (error instanceof PaginationError) {
        expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_SORT_FIELD);
      } else {
        throw error;
      }
    }
  });

  it('should handle custom parameter names', () => {
    const middleware = createPaginationMiddleware({
      paramNames: {
        page: 'p',
        limit: 'l',
        sortBy: 'sort',
        sortOrder: 'order',
      },
    });

    const req = createMockRequest({
      p: '2',
      l: '15',
      sort: 'name',
      order: 'asc',
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    expect(typedReq.pagination.offset).toEqual({
      page: 2,
      limit: 15,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('should disable cursor pagination when configured', () => {
    const middleware = createPaginationMiddleware({
      enableCursorPagination: false,
    });

    const req = createMockRequest({
      cursor: 'test-cursor',
      page: '2',
    });
    const reply = createMockReply();

    const typedReq = req as unknown as PaginationRequest;
    middleware(typedReq, reply as unknown as FastifyReply);

    // Should still use offset pagination even with cursor present
    expect(typedReq.pagination.type).toBe('offset');
  });
});
