// packages/shared/src/core/response.ts
/**
 * API Response Types
 *
 * Type-safe response shapes for consistent API communication.
 */

/**
 * Error response shape for API errors
 */
export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryAfter?: number;
    /** Correlation ID for error tracking and debugging */
    correlationId?: string;
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
