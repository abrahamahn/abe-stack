// apps/server/src/shared/errorMapper.ts
/**
 * Error Mapper
 *
 * Server-specific adapter for the core HTTP error mapper.
 * Adapts AppContext to the framework-agnostic ErrorMapperLogger interface.
 */

import {
  isKnownAuthError as coreIsKnownAuthError,
  mapErrorToHttpResponse,
  type ErrorMapperOptions as CoreErrorMapperOptions,
  type HttpErrorResponse,
} from '@abe-stack/core';

import type { AppContext } from '@shared/types';

/**
 * HTTP status codes returned by error mapper
 * @deprecated Import ErrorStatusCode from '@abe-stack/core' instead
 */
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;

/**
 * Standard error response structure
 * @deprecated Import HttpErrorResponse from '@abe-stack/core' instead
 */
export type ErrorResponse = HttpErrorResponse;

/**
 * Options for error mapping behavior
 * @deprecated Import ErrorMapperOptions from '@abe-stack/core' instead
 */
export type ErrorMapperOptions = CoreErrorMapperOptions;

/**
 * Maps known application errors to HTTP responses.
 *
 * This function handles common auth error types and returns appropriate
 * HTTP status codes and messages. Unknown errors return a 500 status.
 *
 * @param error - The caught error
 * @param ctx - Application context (for logging)
 * @param options - Optional configuration for error handling
 * @returns Structured error response with status and body
 *
 * @example
 * ```typescript
 * try {
 *   await authenticateUser(...);
 * } catch (error) {
 *   return mapErrorToResponse(error, ctx);
 * }
 * ```
 */
export function mapErrorToResponse(error: unknown, ctx: AppContext): HttpErrorResponse {
  // Adapt AppContext.log to ErrorMapperLogger interface
  const logger = {
    warn: (context: Record<string, unknown>, message: string): void => {
      ctx.log.warn(context, message);
    },
    error: (context: unknown, message?: string): void => {
      if (message) {
        ctx.log.error(context as Record<string, unknown>, message);
      } else {
        ctx.log.error(context);
      }
    },
  };

  return mapErrorToHttpResponse(error, logger);
}

/**
 * Type guard to check if an error is a known application error
 */
export function isKnownAuthError(error: unknown): boolean {
  return coreIsKnownAuthError(error);
}
