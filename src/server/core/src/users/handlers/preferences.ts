// src/server/core/src/users/handlers/preferences.ts
/**
 * User Preferences Handlers
 *
 * Thin HTTP layer for user preference operations (language, location, personal info).
 * Calls repos directly and formats responses.
 *
 * @module handlers/preferences
 */

import { toISODateOnly } from '@abe-stack/shared';

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
import { getUserById } from '../service';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from '../types';

import type { HandlerContext } from '@abe-stack/server-engine';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

// ============================================================================
// Types
// ============================================================================

/** User preferences response shape. */
export interface UserPreferences {
  language: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  website: string | null;
}

/** Partial update payload for user preferences. */
export interface UpdatePreferencesBody {
  language?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bio?: string | null;
  website?: string | null;
}

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
// Handlers
// ============================================================================

/**
 * Get current authenticated user's preferences.
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param request - Authenticated request with user info
 * @returns 200 with preferences, or 401/404/500 error
 * @complexity O(1) - single database lookup
 */
export async function handleGetPreferences(
  ctx: HandlerContext,
  request: UsersRequest,
): Promise<
  { status: 200; body: UserPreferences } | { status: 401 | 404 | 500; body: { message: string } }
> {
  const deps = asUsersDeps(ctx);

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
        language: user.language,
        country: user.country,
        city: user.city,
        state: user.state,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bio: user.bio,
        website: user.website,
      },
    };
  } catch (error) {
    deps.log.error(toError(error), 'Failed to get user preferences');
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Update current authenticated user's preferences.
 *
 * Accepts a partial update payload and only modifies the provided fields.
 * dateOfBirth strings are converted to Date objects for the repository layer.
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param body - Partial preferences update payload
 * @param request - Authenticated request with user info
 * @returns 200 with updated preferences, or 401/404/500 error
 * @complexity O(1) - single database lookup + update
 */
export async function handleUpdatePreferences(
  ctx: HandlerContext,
  body: UpdatePreferencesBody,
  request: UsersRequest,
): Promise<
  { status: 200; body: UserPreferences } | { status: 401 | 404 | 500; body: { message: string } }
> {
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

    // Build update payload from provided fields
    const updatePayload: Record<string, unknown> = {};
    if ('language' in body) updatePayload['language'] = body.language;
    if ('country' in body) updatePayload['country'] = body.country;
    if ('city' in body) updatePayload['city'] = body.city;
    if ('state' in body) updatePayload['state'] = body.state;
    if ('gender' in body) updatePayload['gender'] = body.gender;
    if ('bio' in body) updatePayload['bio'] = body.bio;
    if ('website' in body) updatePayload['website'] = body.website;
    if ('dateOfBirth' in body) {
      updatePayload['dateOfBirth'] = body.dateOfBirth !== null ? new Date(body.dateOfBirth) : null;
    }

    // Only update if there are changes
    if (Object.keys(updatePayload).length > 0) {
      const updated = await deps.repos.users.update(userId, updatePayload);

      if (updated === null) {
        return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
      }

      // Fire-and-forget audit logging
      record(
        { auditEvents: deps.repos.auditEvents },
        {
          actorId: userId,
          action: 'user.preferences_updated',
          resource: 'user',
          resourceId: userId,
          metadata: { fields: Object.keys(updatePayload) },
        },
      ).catch(() => {});

      // Fire-and-forget activity log
      logActivity(deps.repos.activities, {
        actorId: userId,
        actorType: 'user',
        action: 'user.preferences.updated',
        resourceType: 'user',
        resourceId: userId,
        metadata: { fields: Object.keys(updatePayload) },
      }).catch(() => {});

      return {
        status: 200,
        body: {
          language: updated.language ?? null,
          country: updated.country ?? null,
          city: updated.city ?? null,
          state: updated.state ?? null,
          dateOfBirth: toISODateOnly(updated.dateOfBirth),
          gender: updated.gender ?? null,
          bio: updated.bio ?? null,
          website: updated.website ?? null,
        },
      };
    }

    // No fields provided — return current preferences
    const current = await getUserById(deps.repos.users, userId);
    if (current === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        language: current.language,
        country: current.country,
        city: current.city,
        state: current.state,
        dateOfBirth: current.dateOfBirth,
        gender: current.gender,
        bio: current.bio,
        website: current.website,
      },
    };
  } catch (error) {
    deps.log.error(toError(error), 'Failed to update user preferences');
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
