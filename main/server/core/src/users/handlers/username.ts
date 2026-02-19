// main/server/core/src/users/handlers/username.ts
/**
 * Username Update Handler
 *
 * Handles username change requests with cooldown enforcement,
 * reserved username checks, and uniqueness validation.
 *
 * @module handlers/username
 */

import {
  BadRequestError,
  ConflictError,
  getNextUsernameChangeDate,
  isUsernameChangeCooldownActive,
  NotFoundError,
  RESERVED_USERNAMES,
  type UpdateUsernameRequest,
  type UpdateUsernameResponse,
} from '@bslt/shared';

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from '../types';

import type { HandlerContext, RouteResult } from '../../../../system/src';

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to UsersModuleDeps.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed UsersModuleDeps
 * @complexity O(1)
 */
function asUsersDeps(ctx: HandlerContext): UsersModuleDeps {
  return ctx as unknown as UsersModuleDeps;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handle username update request.
 *
 * Validates the new username, checks cooldown period (30 days),
 * verifies uniqueness, and updates the user record.
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param body - Validated UpdateUsernameRequest
 * @param request - Authenticated request with user info
 * @returns 200 with new username and next change date, or error
 * @complexity O(1) - database lookups and single update
 */
export async function handleUpdateUsername(
  ctx: HandlerContext,
  body: UpdateUsernameRequest,
  request: UsersRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const userId = request.user.userId;
    const user = await deps.repos.users.findById(userId);

    if (user === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    // Check cooldown period
    const lastChange = user.lastUsernameChange ?? null;
    if (isUsernameChangeCooldownActive(lastChange)) {
      const nextAllowed = getNextUsernameChangeDate(lastChange);
      return {
        status: 429,
        body: {
          message: `Username can only be changed once every 30 days. Next change allowed at ${nextAllowed.toISOString()}`,
        },
      };
    }

    const newUsername = body.username;

    // Guard against runtime/module-boundary issues where constants may be undefined.
    const reservedUsernames = Array.isArray(RESERVED_USERNAMES)
      ? (RESERVED_USERNAMES as readonly string[])
      : (['admin', 'root', 'system'] as const);

    // Check reserved usernames
    if (reservedUsernames.includes(newUsername)) {
      return { status: 400, body: { message: 'This username is reserved' } };
    }

    // Check if same as current
    if (newUsername === user.username) {
      return { status: 400, body: { message: 'New username is the same as current username' } };
    }

    // Check uniqueness
    const existing = await deps.repos.users.findByUsername(newUsername);
    if (existing !== null && existing.id !== userId) {
      return { status: 409, body: { message: 'Username is already taken' } };
    }

    // Update user with new username and track the change time
    const now = new Date();
    const updated = await deps.repos.users.update(userId, {
      username: newUsername,
      lastUsernameChange: now,
    });

    if (updated === null || updated.username === null) {
      return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
    }

    const nextChangeDate = getNextUsernameChangeDate(now);
    const response: UpdateUsernameResponse = {
      username: updated.username,
      nextChangeAllowedAt: nextChangeDate.toISOString(),
    };

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'user.username_changed',
        resource: 'user',
        resourceId: userId,
        metadata: { oldUsername: user.username, newUsername: updated.username },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'user.username.changed',
      resourceType: 'user',
      resourceId: userId,
      metadata: { oldUsername: user.username, newUsername: updated.username },
    }).catch(() => {});

    return { status: 200, body: response };
  } catch (error) {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { message: error.message } };
    }
    if (error instanceof NotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    if (error instanceof ConflictError) {
      return { status: 409, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to update username',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
