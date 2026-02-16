// main/shared/src/core/schemas.ts
/**
 * Common Validation Schemas
 *
 * Shared validation schemas used across multiple API contracts.
 * Centralizes email, password, and other common field validations.
 */

import { ERROR_CODES } from '../primitives/constants';

import { createSchema, UUID_REGEX } from './schema.utils';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Validation Helpers (Ported from contracts/common.ts)
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX_LOCAL = /^[a-zA-Z0-9_]{1,15}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length >= 1 && email.length <= 255;
}

function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

// ============================================================================
// Common Schemas
// ============================================================================

export const emailSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Email must be a string');
  const normalized = data.trim().toLowerCase();
  if (!isValidEmail(normalized)) throw new Error('Invalid email format');
  return normalized;
});

export const passwordSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Password must be a string');
  if (data.length < 8) throw new Error('Password must be at least 8 characters');
  return data;
});

export const uuidSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('UUID must be a string');
  if (!isValidUuid(data)) throw new Error('Invalid UUID format');
  return data;
});

export const nameSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Name must be a string');
  if (data.length < 2) throw new Error('Name must be at least 2 characters');
  return data;
});

export const requiredNameSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Name must be a string');
  if (data.length < 2) throw new Error('Name must be at least 2 characters');
  return data;
});

export const usernameSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Username must be a string');
  const normalized = data.trim().toLowerCase();
  if (normalized.length === 0) throw new Error('Username is required');
  if (!USERNAME_REGEX_LOCAL.test(normalized)) {
    throw new Error('Username must be 1-15 characters: letters, numbers, and underscores only');
  }
  return normalized;
});

export const firstNameSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('First name must be a string');
  const trimmed = data.trim();
  if (trimmed.length === 0) throw new Error('First name is required');
  if (trimmed.length > 50) throw new Error('First name must be at most 50 characters');
  return trimmed;
});

export const lastNameSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Last name must be a string');
  const trimmed = data.trim();
  if (trimmed.length > 50) throw new Error('Last name must be at most 50 characters');
  return trimmed;
});

export const identifierSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Identifier must be a string');
  const trimmed = data.trim().toLowerCase();
  if (trimmed.length === 0) throw new Error('Email or username is required');
  return trimmed;
});

export const isoDateTimeSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('ISO datetime must be a string');
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid ISO datetime format');
  return data;
});

// ============================================================================
// Profile Field Schemas
// ============================================================================

/** Loose phone number: optional +, digits/spaces/dashes/parens, 7-20 chars */
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
/** Date-only format: YYYY-MM-DD */
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
/** URL starting with http(s):// */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Optional phone number schema. Loose validation for international formats.
 *
 * @complexity O(1)
 */
export const phoneSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Phone must be a string');
  const trimmed = data.trim();
  if (trimmed === '') return undefined;
  if (!PHONE_REGEX.test(trimmed)) throw new Error('Invalid phone number format');
  return trimmed;
});

/**
 * Optional bio/about schema. Max 500 characters.
 *
 * @complexity O(1)
 */
export const bioSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Bio must be a string');
  if (data.length > 500) throw new Error('Bio must be at most 500 characters');
  return data;
});

/**
 * Optional website URL schema. Must start with http:// or https://.
 *
 * @complexity O(1)
 */
export const websiteSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Website must be a string');
  const trimmed = data.trim();
  if (trimmed === '') return undefined;
  if (!URL_REGEX.test(trimmed)) {
    throw new Error('Website must be a valid URL starting with http:// or https://');
  }
  return trimmed;
});

/**
 * Optional date of birth schema. Expects YYYY-MM-DD string format.
 * Validates that the string represents a real calendar date.
 *
 * @complexity O(1)
 */
export const dateOfBirthSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Date of birth must be a YYYY-MM-DD string');
  const trimmed = data.trim();
  if (trimmed === '') return undefined;
  if (!DATE_ONLY_REGEX.test(trimmed)) throw new Error('Date of birth must be in YYYY-MM-DD format');
  const d = new Date(trimmed + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) throw new Error('Date of birth is not a valid date');
  return trimmed;
});

/**
 * Optional gender schema. Free text, max 50 characters.
 *
 * @complexity O(1)
 */
export const genderSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Gender must be a string');
  const trimmed = data.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > 50) throw new Error('Gender must be at most 50 characters');
  return trimmed;
});

/**
 * Creates an optional short text field schema (city, state, country, language).
 * Max 100 characters, trimmed.
 *
 * @param fieldName - Display name for error messages
 * @returns Schema for optional short text validation
 * @complexity O(1)
 */
export function optionalShortTextSchema(fieldName: string): Schema<string | undefined> {
  return createSchema((data: unknown) => {
    if (data === undefined || data === null) return undefined;
    if (typeof data !== 'string') throw new Error(`${fieldName} must be a string`);
    const trimmed = data.trim();
    if (trimmed === '') return undefined;
    if (trimmed.length > 100) throw new Error(`${fieldName} must be at most 100 characters`);
    return trimmed;
  });
}

// ============================================================================
// Response Envelopes
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

/** Simple error response (non-envelope) */
export interface ErrorResponse {
  message: string;
  code?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

/** Simple error response schema for non-envelope errors */
export const simpleErrorResponseSchema: Schema<ErrorResponse> = createSchema((input: unknown) => {
  const obj = (input !== null && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (typeof obj['message'] !== 'string') throw new Error('Error message must be a string');
  return {
    message: obj['message'],
    code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
    details:
      obj['details'] !== null && typeof obj['details'] === 'object'
        ? (obj['details'] as Record<string, unknown>)
        : undefined,
  };
});

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
