// main/server/core/src/users/handlers/profile-completeness.ts
/**
 * Profile Completeness Handler
 *
 * Computes profile completeness percentage and identifies missing fields.
 *
 * @module handlers/profile-completeness
 */

import { getUserById } from '../service';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from '../types';

import type { HandlerContext } from '../../../../engine/src';
import type { ProfileCompletenessResponse } from '@abe-stack/shared';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

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
// Profile Completeness Fields
// ============================================================================

/**
 * Fields checked for profile completeness.
 * Each entry maps a display field name to its user object key.
 */
const PROFILE_COMPLETENESS_FIELDS: ReadonlyArray<{
  name: string;
  key: string;
}> = [
  { name: 'firstName', key: 'firstName' },
  { name: 'lastName', key: 'lastName' },
  { name: 'avatarUrl', key: 'avatarUrl' },
  { name: 'bio', key: 'bio' },
  { name: 'city', key: 'city' },
  { name: 'state', key: 'state' },
  { name: 'country', key: 'country' },
  { name: 'language', key: 'language' },
  { name: 'website', key: 'website' },
  { name: 'phone', key: 'phone' },
];

// ============================================================================
// Pure Function
// ============================================================================

/**
 * Compute profile completeness from a user object.
 *
 * Checks a fixed set of profile fields (firstName, lastName, avatarUrl,
 * bio, city, state, country, language, website, phone) and returns the
 * percentage of filled fields and the list of missing field names.
 *
 * @param user - User object with profile fields (values may be string or null)
 * @returns Object with percentage (0-100) and missingFields array
 * @complexity O(n) where n = number of checked fields (constant ~10)
 */
export function computeProfileCompleteness(
  user: Record<string, unknown>,
): ProfileCompletenessResponse {
  const missingFields: string[] = [];

  for (const field of PROFILE_COMPLETENESS_FIELDS) {
    const value = user[field.key];
    if (value === null || value === undefined || value === '') {
      missingFields.push(field.name);
    }
  }

  const totalFields = PROFILE_COMPLETENESS_FIELDS.length;
  const filledFields = totalFields - missingFields.length;
  const percentage = Math.round((filledFields / totalFields) * 100);

  return { percentage, missingFields };
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Get profile completeness for the authenticated user.
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param request - Authenticated request with user info
 * @returns 200 with completeness data, or 401/404/500 error
 * @complexity O(1) - single database lookup + field counting
 */
export async function handleGetProfileCompleteness(
  ctx: HandlerContext,
  request: UsersRequest,
): Promise<
  | { status: 200; body: ProfileCompletenessResponse }
  | { status: 401 | 404 | 500; body: { message: string } }
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

    const completeness = computeProfileCompleteness(user as unknown as Record<string, unknown>);

    return { status: 200, body: completeness };
  } catch (error) {
    deps.log.error(toError(error), 'Failed to compute profile completeness');
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
