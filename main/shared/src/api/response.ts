// main/shared/src/api/response.ts
/**
 * API Response Module
 *
 * Re-exports response schemas from engine/http/response (canonical source)
 * and provides api-level response types and type guards.
 */

export {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponse,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
} from '../engine/http/response';

// ============================================================================
// API-Level Response Types & Guards
// ============================================================================

/**
 * Error response shape for API errors
 */
export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    correlationId?: string | undefined;
    details?: Record<string, unknown>;
    retryAfter?: number;
  };
};

/**
 * Success response shape for API data
 */
export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard for success responses
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.ok;
}

/**
 * Type guard for error responses
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return !response.ok;
}
