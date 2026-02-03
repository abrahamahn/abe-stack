// infra/src/http/pagination/pagination-integration.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createPaginationHelpers } from './helpers';
import { createPaginationMiddleware } from './middleware';

import type { PaginationRequest } from './types';
import type { PaginationOptions } from '@abe-stack/shared';
import type { FastifyReply } from 'fastify';

describe('Pagination Integration', () => {
  it('should work end-to-end with middleware and helpers', () => {
    // Mock Fastify request/reply
    const mockRequest = {
      query: {
        page: '2',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    };

    const mockReply = {} as FastifyReply;

    // Create middleware
    const middleware = createPaginationMiddleware({
      defaultLimit: 50,
      maxLimit: 100,
    });

    // Apply middleware
    middleware(mockRequest as PaginationRequest, mockReply);

    // Verify middleware parsed correctly
    const paginatedRequest = mockRequest as PaginationRequest;
    expect(paginatedRequest.pagination.type).toBe('offset');
    expect(paginatedRequest.pagination.offset).toEqual({
      page: 2,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    // Test helpers work with parsed pagination
    const helpers = paginatedRequest.pagination.helpers;
    expect(typeof helpers.createOffsetResult).toBe('function');
    expect(typeof helpers.createCursorResult).toBe('function');
  });

  it('should handle cursor pagination end-to-end', () => {
    // Mock request with cursor
    const mockRequest = {
      query: {
        cursor:
          'eyJ2YWx1ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwidGllQnJlYWtlciI6IjEyMyIsInNvcnRPcmRlciI6ImRlc2MifQ',
        limit: '25',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    };

    const mockReply = {} as FastifyReply;

    const middleware = createPaginationMiddleware();
    middleware(mockRequest as PaginationRequest, mockReply);

    const paginatedRequest = mockRequest as PaginationRequest;
    expect(paginatedRequest.pagination.type).toBe('cursor');
    expect(paginatedRequest.pagination.cursor).toEqual({
      cursor:
        'eyJ2YWx1ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwidGllQnJlYWtlciI6IjEyMyIsInNvcnRPcmRlciI6ImRlc2MifQ',
      limit: 25,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('should demonstrate complete flow with mock database query', async () => {
    // Mock database query builder
    const mockData = [
      { id: '1', name: 'Item 1', createdAt: '2024-01-01' },
      { id: '2', name: 'Item 2', createdAt: '2024-01-02' },
    ];

    const mockQueryBuilder = {
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(100),
      clone: vi.fn().mockReturnThis(),
    };

    // Set up the mock to return data on final call
    mockQueryBuilder.limit.mockResolvedValue(mockData);

    // Simulate middleware parsing
    const offsetOptions: PaginationOptions = {
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const mockRequest = {
      query: { page: '1', limit: '50' },
      pagination: {
        type: 'offset',
        offset: offsetOptions,
        helpers: createPaginationHelpers(),
      },
    };

    // Apply pagination to query
    const { data, total } = await mockRequest.pagination.helpers.applyOffsetPagination(
      mockQueryBuilder,
      offsetOptions,
    );

    // Create response
    const result = mockRequest.pagination.helpers.createOffsetResult(data, total, offsetOptions);

    expect(result.data).toEqual(mockData);
    expect(result.total).toBe(100);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it('should handle error scenarios gracefully', () => {
    const middleware = createPaginationMiddleware();

    // Test invalid page
    const invalidRequest = {
      query: { page: 'invalid' },
    };

    const reply = {} as FastifyReply;

    expect(() => {
      middleware(invalidRequest as unknown as PaginationRequest, reply);
    }).toThrow();

    // Test limit too high
    const highLimitRequest = {
      query: { limit: '1000' },
    };

    expect(() => {
      middleware(highLimitRequest as unknown as PaginationRequest, reply);
    }).toThrow();
  });
});
