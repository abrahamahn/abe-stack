// main/shared/src/primitives/helpers/response.ts
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
    correlationId: string | undefined;
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
