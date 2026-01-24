// apps/server/src/modules/users/handlers.ts
/**
 * User Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { type RequestWithCookies } from '@modules/auth';
import { ERROR_MESSAGES, type AppContext } from '@shared';
import { getUserById, listUsers } from '@users/service';

import type { CursorPaginatedResult, User } from '@abe-stack/core';
import type { PaginationRequest } from '@pagination';

/**
 * Get current authenticated user's profile
 */
export async function handleMe(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<{ status: 200; body: User } | { status: 401 | 404 | 500; body: { message: string } }> {
  // User is already verified by middleware
  if (!request.user) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await getUserById(ctx.repos.users, request.user.userId);

    if (!user) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Get a paginated list of users (admin only)
 */
export async function handleListUsers(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: CursorPaginatedResult<User> }
  | { status: 400 | 500; body: { message: string } }
> {
  const { pagination } = request as RequestWithCookies & PaginationRequest;

  if (pagination.type !== 'cursor' || !pagination.cursor) {
    return {
      status: 400,
      body: { message: 'This endpoint only supports cursor pagination' },
    };
  }

  try {
    const { users, nextCursor, hasNext } = await listUsers(ctx.repos.users, pagination.cursor);

    const userResponses: User[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
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
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
