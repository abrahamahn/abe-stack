// main/server/realtime/src/handlers/subscribe.ts
/**
 * Realtime Subscribe Handlers
 *
 * HTTP handler for fetching records by their table and ID pointers.
 * Used for initial data loading when subscribing to records.
 *
 * @module handlers/subscribe
 */

import { isTableAllowed, loadRecords } from '../service';

type RecordPointer = { table: string; id: string };
type RecordMap = import('../types').GetRecordsResult['recordMap'];

type SubscribeContext = {
  db: Parameters<typeof loadRecords>[0];
  log: unknown;
};

type SubscribeRequest = {
  user?: {
    userId?: unknown;
  };
};

type ErrorBody = { code: string; message: string };
type GetRecordsResult = import('../types').GetRecordsResult;
type RouteResult<TBody> = { status: number; body: TBody };
const loadRecordsTyped = loadRecords as (
  db: SubscribeContext['db'],
  pointers: RecordPointer[],
) => Promise<RecordMap>;

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INTERNAL_ERROR: 'Internal server error',
} as const;

function tableNotAllowed(table: string): string {
  return `Table '${table}' is not allowed for realtime operations`;
}

function isAuthenticatedRequest(req: SubscribeRequest): req is { user: { userId: string } } {
  return typeof req.user?.userId === 'string' && req.user.userId.length > 0;
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
  ctx: SubscribeContext,
  body: { pointers: RecordPointer[] },
  req: SubscribeRequest,
): Promise<RouteResult<GetRecordsResult | ErrorBody>> {
  const log = ctx.log as {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };

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
          message: tableNotAllowed(pointer.table),
        },
      };
    }
  }

  try {
    log.debug('GetRecords request', {
      userId,
      pointerCount: body.pointers.length,
    });

    const loadedRecordMap = await loadRecordsTyped(ctx.db, body.pointers);
    const recordMap = loadedRecordMap as unknown as GetRecordsResult['recordMap'];

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
