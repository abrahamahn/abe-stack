// main/shared/src/system/http/response.ts
/**
 * Response Envelope Schemas
 *
 * Validation schemas for API response envelopes (success/error).
 * Lives in engine/ so contracts can import without violating the DAG.
 */

import { createSchema, type Schema } from '../../primitives/schema';
import { ERROR_CODES } from '../constants/platform';

// ============================================================================
// Response Envelope Types
// ============================================================================

export interface SuccessResponseEnvelope<T> {
  ok: true;
  data: T;
}

export interface ErrorResponseEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
  };
}

export type ApiResultEnvelope<T> = SuccessResponseEnvelope<T> | ErrorResponseEnvelope;

// ============================================================================
// Response Schemas
// ============================================================================

export function successResponseSchema<T>(
  dataSchema: Schema<T>,
): Schema<SuccessResponseEnvelope<T>> {
  return createSchema((input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] !== true) throw new Error('Expected ok to be true');
    return {
      ok: true as const,
      data: dataSchema.parse(obj['data']),
    };
  });
}

export const envelopeErrorResponseSchema: Schema<ErrorResponseEnvelope> = createSchema(
  (input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] !== false) throw new Error('Expected ok to be false');
    const errorObj = (
      obj['error'] !== null && typeof obj['error'] === 'object' ? obj['error'] : {}
    ) as Record<string, unknown>;
    if (typeof errorObj['code'] !== 'string') throw new Error('Error code must be a string');
    if (typeof errorObj['message'] !== 'string') throw new Error('Error message must be a string');
    return {
      ok: false as const,
      error: {
        code: errorObj['code'],
        message: errorObj['message'],
        details: errorObj['details'] as Record<string, unknown>,
      },
    };
  },
);

/** Default error response schema (envelope format) */
export const errorResponseSchema = envelopeErrorResponseSchema;

export function apiResultSchema<T>(dataSchema: Schema<T>): Schema<ApiResultEnvelope<T>> {
  const success = successResponseSchema(dataSchema);
  return createSchema((input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] === true) return success.parse(input);
    return envelopeErrorResponseSchema.parse(input);
  });
}

// ============================================================================
// Other Helpers
// ============================================================================

/** Simple error response (non-envelope) */
export interface SimpleErrorResponse {
  message: string;
  code?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

/** Simple error response schema for non-envelope errors */
export const simpleErrorResponseSchema: Schema<SimpleErrorResponse> = createSchema(
  (input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (typeof obj['message'] !== 'string') throw new Error('Error message must be a string');
    return {
      message: obj['message'],
      code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
      details:
        obj['details'] !== null && typeof obj['details'] === 'object'
          ? (obj['details'] as Record<string, unknown>)
          : undefined,
    };
  },
);

export type EmptyBody = Record<string, never>;

export const emptyBodySchema: Schema<EmptyBody> = createSchema((_data: unknown) => {
  return {} as EmptyBody;
});

export function createErrorCodeSchema(errorCodes: Record<string, string>): Schema<string> {
  const validCodes = Object.values(errorCodes);
  return createSchema((data: unknown) => {
    if (typeof data !== 'string') throw new Error('Error code must be a string');
    if (!validCodes.includes(data)) throw new Error(`Invalid error code: "${data}"`);
    return data;
  });
}

export const errorCodeSchema = createErrorCodeSchema(ERROR_CODES);
