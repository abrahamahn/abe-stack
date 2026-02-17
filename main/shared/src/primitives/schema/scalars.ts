// main/shared/src/primitives/schema/scalars.ts

import { EMAIL_REGEX, UUID_REGEX } from '../constants/regex';
import { createSchema } from './factory';

import type { Schema } from './types';

// ============================================================================
// Validation Helpers
// ============================================================================

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length >= 1 && email.length <= 255;
}

function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

// ============================================================================
// Scalar Schemas
// ============================================================================

/** ISO 8601 datetime string validator */
export const isoDateTimeSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('ISO datetime must be a string');
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid ISO datetime format');
  return data;
});

/** Email address validator (normalizes to lowercase, trimmed) */
export const emailSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Email must be a string');
  const normalized = data.trim().toLowerCase();
  if (!isValidEmail(normalized)) throw new Error('Invalid email format');
  return normalized;
});

/** Password validator (minimum 8 characters) */
export const passwordSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('Password must be a string');
  if (data.length < 8) throw new Error('Password must be at least 8 characters');
  return data;
});

/** UUID v4 string validator */
export const uuidSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') throw new Error('UUID must be a string');
  if (!isValidUuid(data)) throw new Error('Invalid UUID format');
  return data;
});
