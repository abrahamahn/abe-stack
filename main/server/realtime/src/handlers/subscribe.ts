// main/server/realtime/src/handlers/subscribe.ts
/**
 * Realtime Subscribe Handlers
 *
 * HTTP handler for fetching records by their table and ID pointers.
 * Used for initial data loading when subscribing to records.
 *
 * @module handlers/subscribe
 */

import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  isAuthenticatedRequest,
  REALTIME_ERRORS,
} from '@bslt/shared';

import { isTableAllowed, loadRecords } from '../service';

import type { RecordPointer, RouteResult } from '@bslt/shared';
import type { GetRecordsResult, RealtimeModuleDeps, RealtimeRequest } from '../types';

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
): Promise<RouteResult<GetRecordsResult | { code: string; message: string }>> {
  const { db, log } = ctx;

  // Require authentication using type guard
  if (!isAuthenticatedRequest(req)) {
    return {
      status: HTTP_STATUS.FORBIDDEN,
      body: { code: ERROR_CODES.FORBIDDEN, message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
    };
  }

  const userId = req.user.userId;

  // Validate all tables are allowed
  for (const pointer of body.pointers) {
    if (!isTableAllowed(pointer.table)) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          code: ERROR_CODES.BAD_REQUEST,
          message: REALTIME_ERRORS.tableNotAllowed(pointer.table),
        },
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
      status: HTTP_STATUS.OK,
      body: { recordMap },
    };
  } catch (error) {
    log.error('GetRecords failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.INTERNAL_ERROR },
    };
  }
}
