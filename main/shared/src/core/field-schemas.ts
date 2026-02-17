// main/shared/src/core/field-schemas.ts

/**
 * @file Field Schemas
 * @description Reusable validation schemas for common fields (name, phone, bio, etc.).
 * @module Core/FieldSchemas
 */

import { DATE_ONLY_REGEX, PHONE_REGEX, URL_REGEX, USERNAME_REGEX_LOCAL } from '../primitives/constants/regex';
import { createSchema } from '../primitives/schema';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Identity Fields
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
// Profile Fields
// ============================================================================

export const phoneSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Phone must be a string');
  const trimmed = data.trim();
  if (trimmed === '') return undefined;
  if (!PHONE_REGEX.test(trimmed)) throw new Error('Invalid phone number format');
  return trimmed;
});

export const bioSchema: Schema<string | undefined> = createSchema((data: unknown) => {
  if (data === undefined || data === null) return undefined;
  if (typeof data !== 'string') throw new Error('Bio must be a string');
  if (data.length > 500) throw new Error('Bio must be at most 500 characters');
  return data;
});

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
