// main/shared/src/core/schemas.ts
/**
 * Common Validation Schemas
 *
 * Shared validation schemas used across multiple API contracts.
 * Centralizes email, password, and other common field validations.
 */

import { createSchema } from '../primitives/schema';
import {
  emailSchema,
  isoDateTimeSchema,
  passwordSchema,
  uuidSchema,
} from '../primitives/schema/scalars';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Re-exports from primitives (canonical source)
// ============================================================================

export { emailSchema, isoDateTimeSchema, passwordSchema, uuidSchema };

// ============================================================================
// Validation Helpers
// ============================================================================

const USERNAME_REGEX_LOCAL = /^[a-zA-Z0-9_]{1,15}$/;

// ============================================================================
// Common Schemas
// ============================================================================

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
