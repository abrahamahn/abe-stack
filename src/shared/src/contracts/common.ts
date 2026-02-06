// packages/shared/src/contracts/common.ts
/**
 * Common Validation Schemas
 *
 * Shared validation schemas used across multiple API contracts.
 * Centralizes email, password, and other common field validations.
 */

import { createSchema } from './schema';

import type { Schema } from './types';

// ============================================================================
// Validation Helpers
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// UUID format: 8-4-4-4-12 hex characters (accepts nil UUID and all versions)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length >= 1 && email.length <= 255;
}

function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

// ============================================================================
// Email Schema
// ============================================================================

/**
 * Standard email validation schema.
 * Trims whitespace and lowercases for consistent storage.
 * Used consistently across auth, users, and admin contracts.
 *
 * @complexity O(n) where n is string length
 */
export const emailSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Email must be a string');
  }
  const normalized = data.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    throw new Error('Invalid email format');
  }
  return normalized;
});

// ============================================================================
// Password Schema
// ============================================================================

/**
 * Basic password validation schema (minimum length only).
 * For comprehensive password strength validation, use validatePassword() from auth domain.
 */
export const passwordSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Password must be a string');
  }
  if (data.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return data;
});

// ============================================================================
// Common Field Schemas
// ============================================================================

/**
 * UUID string schema for entity IDs.
 */
export const uuidSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('UUID must be a string');
  }
  if (!isValidUuid(data)) {
    throw new Error('Invalid UUID format');
  }
  return data;
});

/**
 * Optional name field with minimum length.
 */
export const nameSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) {
    return undefined;
  }
  if (typeof data !== 'string') {
    throw new Error('Name must be a string');
  }
  if (data.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  return data;
});

/**
 * Required name field with minimum length.
 */
export const requiredNameSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Name must be a string');
  }
  if (data.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  return data;
});

/**
 * Standard error response type.
 */
export interface ErrorResponse {
  message: string;
  code?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

/**
 * Standard error response schema used across all API endpoints.
 */
export const errorResponseSchema: Schema<ErrorResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid error response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['message'] !== 'string') {
    throw new Error('Error response must have a message');
  }
  return {
    message: obj['message'],
    code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
    details:
      obj['details'] !== null && obj['details'] !== undefined && typeof obj['details'] === 'object'
        ? (obj['details'] as Record<string, unknown>)
        : undefined,
  };
});

// ============================================================================
// ISO DateTime Schema
// ============================================================================

/**
 * ISO 8601 datetime regex.
 * Requires date + time separator 'T' + time + optional offset/Z.
 * Rejects date-only strings like "2023-01-01".
 */
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * ISO 8601 Date String Schema.
 * Validates that the string is a valid ISO datetime with time component.
 * Rejects date-only strings and invalid dates.
 *
 * @example "2023-01-01T12:00:00Z"
 * @complexity O(1)
 */
export const isoDateTimeSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('ISO datetime must be a string');
  }
  if (!ISO_DATETIME_REGEX.test(data)) {
    throw new Error('Invalid ISO datetime format');
  }
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid ISO datetime format');
  }
  return data;
});

// ============================================================================
// Empty Body Schema
// ============================================================================

/** Empty request body type */
export type EmptyBody = Record<string, never>;

/**
 * Strict Empty Body Schema.
 * Used for endpoints that require no request body.
 * Accepts empty objects `{}`, undefined, and null.
 */
export const emptyBodySchema: Schema<EmptyBody> = createSchema((data: unknown) => {
  if (data === undefined || data === null) {
    return {} as EmptyBody;
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Body must be an empty object');
  }
  const keys = Object.keys(data as Record<string, unknown>);
  if (keys.length > 0) {
    throw new Error('Body must be empty');
  }
  return data as EmptyBody;
});

// ============================================================================
// Error Code Schema
// ============================================================================

/**
 * Error code validation schema.
 * Validates that the value is a known error code string.
 *
 * @param errorCodes - Record of error code constants
 * @returns Schema that validates against the error codes
 */
export function createErrorCodeSchema(errorCodes: Record<string, string>): Schema<string> {
  const validCodes = Object.values(errorCodes);
  return createSchema((data: unknown) => {
    if (typeof data !== 'string') {
      throw new Error('Error code must be a string');
    }
    if (!validCodes.includes(data)) {
      throw new Error(`Invalid error code: "${data}"`);
    }
    return data;
  });
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/** Success response envelope */
export interface SuccessResponseEnvelope<T> {
  ok: true;
  data: T;
}

/** Error response envelope (used in contract definitions) */
export interface ErrorResponseEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
  };
}

/** API result: success or error */
export type ApiResultEnvelope<T> = SuccessResponseEnvelope<T> | ErrorResponseEnvelope;

/**
 * Creates a schema that validates a `{ ok: true, data: T }` envelope.
 *
 * @param dataSchema - Schema for the `data` field
 * @returns Schema for the success response envelope
 * @complexity O(1) overhead + cost of dataSchema.parse
 */
export function successResponseSchema<T>(
  dataSchema: Schema<T>,
): Schema<SuccessResponseEnvelope<T>> {
  return createSchema((input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] !== true) {
      throw new Error('Expected ok to be true');
    }
    return {
      ok: true as const,
      data: dataSchema.parse(obj['data']),
    };
  });
}

/**
 * Schema for the standard error response envelope `{ ok: false, error: { code, message, details? } }`.
 */
export const envelopeErrorResponseSchema: Schema<ErrorResponseEnvelope> = createSchema(
  (input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] !== false) {
      throw new Error('Expected ok to be false');
    }
    const errorObj = (
      obj['error'] !== null && typeof obj['error'] === 'object' ? obj['error'] : {}
    ) as Record<string, unknown>;
    if (typeof errorObj['code'] !== 'string') {
      throw new Error('Error code must be a string');
    }
    if (typeof errorObj['message'] !== 'string') {
      throw new Error('Error message must be a string');
    }
    return {
      ok: false as const,
      error: {
        code: errorObj['code'],
        message: errorObj['message'],
        details:
          errorObj['details'] !== null &&
          errorObj['details'] !== undefined &&
          typeof errorObj['details'] === 'object'
            ? (errorObj['details'] as Record<string, unknown>)
            : undefined,
      },
    };
  },
);

/**
 * Creates a discriminated union schema for API results (success | error).
 *
 * @param dataSchema - Schema for the success `data` field
 * @returns Schema that validates either a success or error envelope
 * @complexity O(1) overhead + cost of dataSchema.parse on success branch
 */
export function apiResultSchema<T>(dataSchema: Schema<T>): Schema<ApiResultEnvelope<T>> {
  const success = successResponseSchema(dataSchema);
  return createSchema((input: unknown) => {
    const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<
      string,
      unknown
    >;
    if (obj['ok'] === true) {
      return success.parse(input);
    }
    return envelopeErrorResponseSchema.parse(input);
  });
}
