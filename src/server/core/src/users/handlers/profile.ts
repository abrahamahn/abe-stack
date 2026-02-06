// backend/core/src/users/handlers/profile.ts
/**
 * User Profile Handlers
 *
 * Thin HTTP layer for user profile operations.
 * Calls services and formats responses.
 *
 * @module handlers/profile
 */

import { getUserById, listUsers } from '../service';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from '../types';

import type { HandlerContext } from '@abe-stack/db';
import type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  User,
  UserId,
} from '@abe-stack/shared';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to UsersModuleDeps.
 * The server composition root ensures the context implements UsersModuleDeps.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed UsersModuleDeps
 * @complexity O(1)
 */
function asUsersDeps(ctx: HandlerContext): UsersModuleDeps {
  return ctx as unknown as UsersModuleDeps;
}

// ============================================================================
// Pagination Request Type
// ============================================================================

/**
 * Request with pagination data attached by middleware.
 */
interface PaginationRequest {
  pagination: {
    type: 'cursor' | 'offset';
    cursor?: CursorPaginationOptions;
    helpers: {
      createCursorResult: <T>(
        data: T[],
        nextCursor: string | null,
        hasNext: boolean,
        limit: number,
      ) => CursorPaginatedResult<T>;
    };
  };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get current authenticated user's profile.
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param request - Authenticated request with user info
 * @returns 200 with user data, or 401/404/500 error
 * @complexity O(1) - single database lookup
 */
export async function handleMe(
  ctx: HandlerContext,
  request: UsersRequest,
): Promise<{ status: 200; body: User } | { status: 401 | 404 | 500; body: { message: string } }> {
  const deps = asUsersDeps(ctx);

  // User is already verified by middleware
  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await getUserById(deps.repos.users, request.user.userId);

    if (user === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        id: user.id as UserId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        isVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    deps.log.error(toError(error), 'Users operation failed');
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get a paginated list of users (admin only).
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param request - Authenticated request with pagination info
 * @returns 200 with paginated user list, or 400/500 error
 * @complexity O(n) where n is the page size
 */
export async function handleListUsers(
  ctx: HandlerContext,
  request: UsersRequest,
): Promise<
  | { status: 200; body: CursorPaginatedResult<User> }
  | { status: 400 | 500; body: { message: string } }
> {
  const deps = asUsersDeps(ctx);
  const { pagination } = request as UsersRequest & PaginationRequest;

  if (pagination.type !== 'cursor' || pagination.cursor === undefined) {
    return {
      status: 400,
      body: { message: 'This endpoint only supports cursor pagination' },
    };
  }

  try {
    const { users, nextCursor, hasNext } = await listUsers(deps.repos.users, pagination.cursor);

    const userResponses: User[] = users.map((user) => ({
      id: user.id as UserId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      isVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return {
      status: 200,
      body: pagination.helpers.createCursorResult(
        userResponses,
        nextCursor,
        hasNext,
        pagination.cursor.limit,
      ),
    };
  } catch (error) {
    deps.log.error(toError(error), 'Users operation failed');
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
