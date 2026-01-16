// apps/server/src/modules/users/handlers.ts
/**
 * User Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { type RequestWithCookies } from '@modules/auth';
import { ERROR_MESSAGES, type AppContext } from '@shared';
import { getUserById } from '@users/service';

import type { UserResponse } from '@abe-stack/core';

/**
 * Get current authenticated user's profile
 */
export async function handleMe(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  { status: 200; body: UserResponse } | { status: 401 | 404 | 500; body: { message: string } }
> {
  // User is already verified by middleware
  if (!request.user) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await getUserById(ctx.db, request.user.userId);

    if (!user) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
