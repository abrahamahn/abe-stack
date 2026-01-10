/**
 * Schema - Single Source of Truth for All Types
 *
 * This file defines all data types used across the entire application.
 * Both server (Drizzle) and client (validation) derive from these.
 *
 * Design principles:
 * - All records have: id, createdAt, updatedAt
 * - Version field enables: real-time sync, offline, undo/redo
 * - Zod schemas for runtime validation
 * - TypeScript types inferred from Zod
 */

import { z } from 'zod';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Base record schema - all entities extend this
 */
export const BaseRecordSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

/**
 * Versioned record - for sync, offline, undo/redo
 */
export const VersionedRecordSchema = BaseRecordSchema.extend({
  version: z.number().int().positive().default(1),
});

// =============================================================================
// USER & AUTH
// =============================================================================

export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * User schema
 */
export const UserSchema = BaseRecordSchema.extend({
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleSchema.default('user'),
});
export type User = z.infer<typeof UserSchema>;

/**
 * User for API responses (with string dates)
 */
export const UserResponseSchema = UserSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * Password - stored separately for security
 */
export const PasswordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  hash: z.string(),
});
export type Password = z.infer<typeof PasswordSchema>;

/**
 * Session - for cookie-based auth
 */
export const SessionSchema = BaseRecordSchema.extend({
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date().or(z.string().datetime()),
});
export type Session = z.infer<typeof SessionSchema>;

// =============================================================================
// AUTH REQUESTS & RESPONSES
// =============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional(),
  password: z.string().min(8),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema.omit({ createdAt: true, updatedAt: true }).extend({
    createdAt: z.string().datetime().optional(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshResponseSchema = z.object({
  token: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LogoutResponseSchema = z.object({
  message: z.string(),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// =============================================================================
// TABLE REGISTRY (for type-safe operations)
// =============================================================================

export const Tables = {
  user: UserSchema,
  password: PasswordSchema,
  session: SessionSchema,
} as const;

export type TableName = keyof typeof Tables;
export type TableRecord<T extends TableName> = z.infer<(typeof Tables)[T]>;

// =============================================================================
// RECORD MAP (for caching, sync)
// =============================================================================

export type RecordMap = {
  [T in TableName]?: {
    [id: string]: TableRecord<T>;
  };
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate a record against its schema
 */
export function validateRecord<T extends TableName>(table: T, data: unknown): TableRecord<T> {
  return Tables[table].parse(data) as TableRecord<T>;
}

/**
 * Safe parse - returns result object instead of throwing
 */
export function safeValidateRecord<T extends TableName>(
  table: T,
  data: unknown,
): z.SafeParseReturnType<unknown, TableRecord<T>> {
  return Tables[table].safeParse(data) as z.SafeParseReturnType<unknown, TableRecord<T>>;
}
