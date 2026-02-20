// main/server/system/src/errors/reply.ts
/**
 * Reply Helpers
 *
 * Bridges the shared error and Result primitives to the abstract HttpReply
 * interface. Enforces the canonical { ok, error/data } wire shape on every
 * response.
 *
 * Usage:
 *   // Service returns Result<T, AppError>
 *   const result = await service.createUser(input);
 *   return sendResult(result, reply, request, 201);
 *
 *   // Direct error reply
 *   return replyError(reply, new NotFoundError(), correlationId);
 *
 *   // Direct success reply
 *   return replyOk(reply, { id: '123' }, 201);
 */

import { isOk } from '@bslt/shared/primitives';
import { getErrorStatusCode, toAppError } from '@bslt/shared/system';

import type { ApiErrorResponse, ApiSuccessResponse, Result } from '@bslt/shared/primitives';
import type { AppError } from '@bslt/shared/system';
import type { HttpReply, HttpRequest } from '../routing/http.types';

// ============================================================================
// Internal builders
// ============================================================================

/**
 * Build the canonical `ApiSuccessResponse<T>` body.
 *
 * @param data - The response payload
 */
function buildOkBody<T>(data: T): ApiSuccessResponse<T> {
  return { ok: true, data };
}

/**
 * Build the canonical `ApiErrorResponse` body from an `AppError`.
 *
 * Uses `error.expose` to decide whether to surface the original message
 * (true for 4xx client errors) or redact it to a generic string (false for
 * 5xx server errors). This mirrors the `AppError` contract without requiring
 * an environment check at the call-site.
 *
 * @param error - The AppError to convert
 * @param correlationId - Optional request correlation ID for client-side tracing
 */
function buildErrorBody(error: AppError, correlationId?: string): ApiErrorResponse {
  const withRetry = error as AppError & { retryAfter?: number };
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.expose ? error.message : 'Internal server error',
      correlationId,
      ...(error.details !== undefined ? { details: error.details } : {}),
      // AccountLockedError carries retryAfter for Retry-After header guidance
      ...(withRetry.retryAfter !== undefined ? { retryAfter: withRetry.retryAfter } : {}),
    },
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Converts a `Result<T, AppError>` into an HTTP reply.
 *
 * On `Ok`  → sends `{ ok: true, data }` at `successStatus` (default 200).
 * On `Err` → sends `{ ok: false, error: { code, message, correlationId } }`
 *             at the status code derived from the AppError.
 *
 * If the error is not already an AppError it is normalised via `toAppError`
 * so callers never need to guard against raw Error instances.
 *
 * @param result - The Result to send
 * @param reply - HTTP reply instance
 * @param request - HTTP request (used to read correlationId)
 * @param successStatus - HTTP status for the success case (default: 200)
 */
export function sendResult<T>(
  result: Result<T, AppError>,
  reply: HttpReply,
  request: HttpRequest,
  successStatus = 200,
): void {
  if (isOk(result)) {
    void reply.status(successStatus).send(buildOkBody(result.data));
    return;
  }

  const error = toAppError(result.error);
  void reply.status(getErrorStatusCode(error)).send(buildErrorBody(error, request.correlationId));
}

/**
 * Sends a typed `ApiErrorResponse` from an `AppError` without throwing.
 *
 * Useful in handlers that want to return an error response directly instead
 * of relying on the global error handler.
 *
 * @param reply - HTTP reply instance
 * @param error - The AppError to send
 * @param correlationId - Optional correlation ID for client-side tracing
 */
export function replyError(reply: HttpReply, error: AppError, correlationId?: string): void {
  void reply.status(getErrorStatusCode(error)).send(buildErrorBody(error, correlationId));
}

/**
 * Sends a typed `ApiSuccessResponse<T>`.
 *
 * @param reply - HTTP reply instance
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 */
export function replyOk(reply: HttpReply, data: unknown, status = 200): void {
  void reply.status(status).send(buildOkBody(data));
}
