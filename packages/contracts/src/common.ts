// packages/contracts/src/common.ts
/**
 * Common Validation Schemas
 *
 * Shared validation schemas used across multiple API contracts.
 * Centralizes email, password, and other common field validations.
 */

import { createSchema, type Schema } from './types';

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
 * Used consistently across auth, users, and admin contracts.
 */
export const emailSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Email must be a string');
  }
  if (!isValidEmail(data)) {
    throw new Error('Invalid email format');
  }
  return data;
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
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard error response schema used across all API endpoints.
 */
export const errorResponseSchema: Schema<ErrorResponse> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid error response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.message !== 'string') {
    throw new Error('Error response must have a message');
  }
  return {
    message: obj.message,
    code: typeof obj.code === 'string' ? obj.code : undefined,
    details:
      obj.details && typeof obj.details === 'object'
        ? (obj.details as Record<string, unknown>)
        : undefined,
  };
});
