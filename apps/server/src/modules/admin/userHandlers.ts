// apps/server/src/modules/admin/userHandlers.ts
/**
 * Admin User Handlers
 *
 * HTTP handlers for administrative user operations.
 * All handlers expect admin role (enforced by route middleware).
 */

import { UserNotFoundError } from '@abe-stack/core';
import { getUserById, listUsers, lockUser, unlockUser, updateUser } from '@admin/userService';
import { ERROR_MESSAGES, type AppContext } from '@shared';

import type {
    AdminLockUserRequest,
    AdminLockUserResponse,
    AdminUpdateUserRequest,
    AdminUpdateUserResponse,
    AdminUser,
    AdminUserListFilters,
    AdminUserListResponse,
    UnlockAccountRequest,
} from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// List Users Handler
// ============================================================================

/**
 * Handle GET /api/admin/users
 */
export async function handleListUsers(
  ctx: AppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: AdminUserListResponse | { message: string } }> {
  const user = request.user as { userId: string; role: string } | undefined;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Parse query parameters from the request
    const query = (request.query ?? {}) as Record<string, unknown>;

    const filters: AdminUserListFilters = {};
    if (typeof query['search'] === 'string') {
      filters.search = query['search'];
    }
    if (typeof query['role'] === 'string') {
      filters.role = query['role'] as 'user' | 'admin' | 'moderator';
    }
    if (typeof query['status'] === 'string') {
      filters.status = query['status'] as 'active' | 'locked' | 'unverified';
    }
    if (typeof query['sortBy'] === 'string') {
      filters.sortBy = query['sortBy'] as 'email' | 'name' | 'createdAt' | 'updatedAt';
    }
    if (typeof query['sortOrder'] === 'string') {
      filters.sortOrder = query['sortOrder'] as 'asc' | 'desc';
    }
    if (query['page'] !== undefined && query['page'] !== null) {
      filters.page = Number(query['page']);
    }
    if (query['limit'] !== undefined && query['limit'] !== null) {
      filters.limit = Number(query['limit']);
    }

    const result = await listUsers(ctx.repos.users, filters);

    ctx.log.info(
      { adminId: user.userId, filters, resultCount: result.data.length },
      'Admin listed users',
    );

    return { status: 200, body: result };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Get User Handler
// ============================================================================

/**
 * Handle GET /api/admin/users/:id
 */
export async function handleGetUser(
  ctx: AppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: AdminUser | { message: string } }> {
  const authUser = request.user as { userId: string; role: string } | undefined;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Get user ID from route params
    const params = request.params as { id: string };
    const userId = params.id;

    if (userId === '') {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const user = await getUserById(ctx.repos.users, userId);

    ctx.log.info({ adminId: authUser.userId, targetUserId: userId }, 'Admin retrieved user');

    return { status: 200, body: user };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Update User Handler
// ============================================================================

/**
 * Handle PATCH /api/admin/users/:id
 */
export async function handleUpdateUser(
  ctx: AppContext,
  body: AdminUpdateUserRequest,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: AdminUpdateUserResponse | { message: string } }> {
  const authUser = request.user as { userId: string; role: string } | undefined;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Get user ID from route params
    const params = request.params as { id: string };
    const userId = params.id;

    if (userId === '') {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const user = await updateUser(ctx.repos.users, userId, body);

    ctx.log.info(
      { adminId: authUser.userId, targetUserId: userId, updates: Object.keys(body) },
      'Admin updated user',
    );

    return {
      status: 200,
      body: {
        message: 'User updated successfully',
        user,
      },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Lock User Handler
// ============================================================================

/**
 * Handle POST /api/admin/users/:id/lock
 */
export async function handleLockUser(
  ctx: AppContext,
  body: AdminLockUserRequest,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: AdminLockUserResponse | { message: string } }> {
  const authUser = request.user as { userId: string; role: string } | undefined;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Get user ID from route params
    const params = request.params as { id: string };
    const userId = params.id;

    if (userId === '') {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    // Prevent admin from locking themselves
    if (userId === authUser.userId) {
      return { status: 400, body: { message: 'Cannot lock your own account' } };
    }

    const user = await lockUser(ctx.repos.users, userId, body.reason, body.durationMinutes);

    ctx.log.info(
      {
        adminId: authUser.userId,
        targetUserId: userId,
        reason: body.reason,
        durationMinutes: body.durationMinutes,
      },
      'Admin locked user account',
    );

    return {
      status: 200,
      body: {
        message: 'User account locked successfully',
        user,
      },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Unlock User Handler
// ============================================================================

/**
 * Handle POST /api/admin/users/:id/unlock
 */
export async function handleUnlockUser(
  ctx: AppContext,
  body: UnlockAccountRequest,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: AdminLockUserResponse | { message: string } }> {
  const authUser = request.user as { userId: string; role: string } | undefined;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Get user ID from route params
    const params = request.params as { id: string };
    const userId = params.id;

    if (userId === '') {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const user = await unlockUser(ctx.repos.users, userId, body.reason);

    ctx.log.info(
      { adminId: authUser.userId, targetUserId: userId, reason: body.reason },
      'Admin unlocked user account',
    );

    return {
      status: 200,
      body: {
        message: 'User account unlocked successfully',
        user,
      },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
