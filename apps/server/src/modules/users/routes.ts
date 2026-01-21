// apps/server/src/modules/users/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 */

import { protectedRoute, type RouteMap, type RouteResult } from '@router';

import { handleMe } from './handlers';

import type { CursorPaginatedResult, UserResponse } from '@abe-stack/core';
import type { PaginationRequest } from '@pagination';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const userRoutes: RouteMap = {
  'users/me': protectedRoute<undefined, UserResponse | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<UserResponse | { message: string }>> => {
      return handleMe(ctx, req);
    },
    'user',
  ),

  // Example paginated endpoint using cursor-based pagination
  'users/list': protectedRoute<
    undefined,
    CursorPaginatedResult<UserResponse> | { message: string }
  >(
    'GET',
    (
      _ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<CursorPaginatedResult<UserResponse> | { message: string }>> => {
      // Extract pagination options from request
      const { pagination } = req as RequestWithCookies & PaginationRequest;

      if (pagination.type !== 'cursor') {
        return Promise.resolve({
          status: 400,
          body: { message: 'This endpoint only supports cursor pagination' },
        });
      }

      const options = pagination.cursor;
      if (!options) {
        return Promise.resolve({
          status: 400,
          body: { message: 'Cursor pagination options are required' },
        });
      }

      // In a real implementation, you would:
      // 1. Apply pagination to your database query
      // 2. Use pagination.helpers.applyCursorPagination()
      // 3. Return the formatted result

      // Mock implementation for demonstration
      const mockUsers: UserResponse[] = [
        {
          id: '1',
          email: 'user1@example.com',
          name: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: null,
          role: 'user',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Use helpers to create properly formatted response
      const result = pagination.helpers.createCursorResult(
        mockUsers,
        null, // No next page in this example
        false, // No more pages
        options.limit,
      );

      return Promise.resolve({
        status: 200,
        body: result,
      });
    },
    'admin', // Only admins can list users
  ),
};
