// src/server/realtime/src/handlers/subscribe.ts
/**
 * Realtime Subscribe Handlers
 *
 * HTTP handler for fetching records by their table and ID pointers.
 * Used for initial data loading when subscribing to records.
 *
 * @module handlers/subscribe
 */

import { isTableAllowed, loadRecords } from '../service';
import { ERROR_MESSAGES } from '../types';

import type { GetRecordsResult, RealtimeModuleDeps, RealtimeRequest } from '../types';
import type { AuthenticatedUser, RecordPointer, RouteResult } from '@abe-stack/shared';

/**
 * Type guard to check if request has authenticated user.
 *
 * @param req - Request to check
 * @returns Whether the request has an authenticated user
 */
function hasAuthenticatedUser(
  req: RealtimeRequest,
): req is RealtimeRequest & { readonly user: AuthenticatedUser } {
  if (req.user === undefined || typeof req.user !== 'object') {
    return false;
  }
  const user = req.user as unknown as Record<string, unknown>;
  return 'userId' in user && typeof user['userId'] === 'string' && user['userId'] !== '';
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle get records request.
 *
 * Fetches multiple records by their table and ID.
 * Returns a RecordMap with all found records.
 *
 * @param ctx - Realtime module dependencies
 * @param body - Request body containing record pointers
 * @param req - Request with authenticated user
 * @returns RouteResult with loaded records or error
 * @throws Never - all errors are caught and returned as HTTP responses
 * @complexity O(t) database queries where t is the number of distinct tables
 */
export async function handleGetRecords(
  ctx: RealtimeModuleDeps,
  body: { pointers: RecordPointer[] },
  req: RealtimeRequest,
): Promise<RouteResult<GetRecordsResult | { message: string }>> {
  const { db, log } = ctx;

  // Require authentication using type guard
  if (!hasAuthenticatedUser(req)) {
    return {
      status: 403,
      body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
    };
  }

  // At this point TypeScript knows req.user is AuthenticatedUser
  const userId = req.user.userId;

  // Validate all tables are allowed
  for (const pointer of body.pointers) {
    if (!isTableAllowed(pointer.table)) {
      return {
        status: 400,
        body: { message: ERROR_MESSAGES.TABLE_NOT_ALLOWED(pointer.table) },
      };
    }
  }

  try {
    log.debug('GetRecords request', {
      userId,
      pointerCount: body.pointers.length,
    });

    const recordMap = await loadRecords(db, body.pointers);

    return {
      status: 200,
      body: { recordMap },
    };
  } catch (error) {
    log.error('GetRecords failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 500,
      body: { message: ERROR_MESSAGES.INTERNAL_ERROR },
    };
  }
}
