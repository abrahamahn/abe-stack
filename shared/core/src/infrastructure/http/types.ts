// shared/core/src/infrastructure/http/types.ts
/**
 * HTTP Types
 *
 * Framework-agnostic HTTP types used across the server stack.
 * These types have NO dependency on Fastify or any HTTP framework.
 */

// ============================================================================
// Request Context
// ============================================================================

/**
 * Request information extracted from HTTP request headers.
 * Framework-agnostic representation of client request metadata.
 *
 * @param ipAddress - The client's IP address (respecting proxy headers)
 * @param userAgent - The client's User-Agent header value
 * @param deviceId - Optional device identifier for tracking
 */
export interface RequestInfo {
  /** Client IP address (from X-Forwarded-For or direct connection) */
  readonly ipAddress: string;
  /** Client User-Agent header (capped at 500 chars) */
  readonly userAgent: string | undefined;
  /** Optional device identifier */
  readonly deviceId?: string;
}

// ============================================================================
// Route Result
// ============================================================================

/**
 * Standard route handler result.
 * Framework-agnostic representation of an HTTP response.
 *
 * @typeParam T - The response body type
 * @param status - HTTP status code
 * @param body - Response body payload
 */
export interface RouteResult<T = unknown> {
  /** HTTP status code */
  readonly status: number;
  /** Response body payload */
  readonly body: T;
}

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Minimal schema interface for request validation.
 * Compatible with Zod and other validators that implement safeParse.
 *
 * @typeParam T - The parsed output type
 */
export interface ValidationSchema<T = unknown> {
  /** Validate data and return parsed result or error */
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: Error };
}
