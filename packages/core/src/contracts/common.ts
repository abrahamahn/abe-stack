// packages/core/src/contracts/common.ts
/**
 * Common Validation Schemas
 *
 * Shared Zod schemas used across multiple API contracts.
 * Centralizes email, password, and other common field validations.
 */

import { z } from 'zod';

// ============================================================================
// Email Schema
// ============================================================================

/**
 * Standard email validation schema.
 * Used consistently across auth, users, and admin contracts.
 */
export const emailSchema = z.email().min(1).max(255);

// ============================================================================
// Password Schema
// ============================================================================

/**
 * Basic password validation schema (minimum length only).
 * For comprehensive password strength validation, use validatePassword() from auth domain.
 */
export const passwordSchema = z.string().min(8);

// ============================================================================
// Common Field Schemas
// ============================================================================

/**
 * UUID string schema for entity IDs.
 */
export const uuidSchema = z.uuid();

/**
 * Optional name field with minimum length.
 */
export const nameSchema = z.string().min(2).optional();

/**
 * Required name field with minimum length.
 */
export const requiredNameSchema = z.string().min(2);

/**
 * Standard error response schema used across all API endpoints.
 */
export const errorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
