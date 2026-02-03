// shared/src/core/schemas.ts
/**
 * @file Common Schemas
 * @description Reusable Zod schemas and types for use across all domains.
 * @module Shared/Schemas
 */

import { z } from 'zod';

import { validatePassword } from '../utils/password';

import { ERROR_CODES } from './constants';


// ============================================================================
// Primitives & Formats
// ============================================================================

/**
 * Zod schema for validated error codes
 */
export const errorCodeSchema = z.nativeEnum(ERROR_CODES);

/**
 * ISO 8601 Date String Schema
 * Validates that the string is a valid ISO datetime with offset.
 * @example "2023-01-01T12:00:00Z"
 */
export const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * Standard Email Schema
 * Enforces email format, lowercase normalized, and trimmed.
 */
export const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Standard Password Schema
 * Enforces minimum requirements: min 8 chars, uppercase, lowercase, and basic strength.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .superRefine((val, ctx) => {
    const { isValid, errors } = validatePassword(val);
    if (!isValid) {
      errors.forEach((message) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
      });
    }
  });

/**
 * Strict Empty Body Schema
 * Used for endpoints that require no request body.
 * Enforces an empty object `{}`.
 */
export const emptyBodySchema = z.object({}).strict();
export type EmptyBody = z.infer<typeof emptyBodySchema>;

// ============================================================================
// API Response Structures
// ============================================================================

/**
 * Generic Error Response Schema
 * Standard format for all API errors.
 */
export const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: errorCodeSchema,
    message: z.string().describe('Human-readable error message'),
    details: z.record(z.unknown()).optional().describe('Optional additional error details'),
  }),
});

export function successResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
): z.ZodObject<{
  ok: z.ZodLiteral<true>;
  data: T;
}> {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
  });
}

/**
 * Full API Result Schema Factory
 * Creates a union of Success | Error for a given data schema.
 * @param dataSchema - Zod schema for the success payload
 */
export function apiResultSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
): z.ZodDiscriminatedUnion<
  'ok',
  [z.ZodObject<{ ok: z.ZodLiteral<true>; data: T }>, typeof errorResponseSchema]
> {
  return z.discriminatedUnion('ok', [successResponseSchema(dataSchema), errorResponseSchema]);
}

// ============================================================================
// Type Definitions
// ============================================================================

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
