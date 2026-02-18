// main/shared/src/core/auth/auth.sessions.schemas.ts
/**
 * @file Auth Session Schemas
 * @description Schemas for user session validation and type inference.
 * @module Core/Auth
 */

import {
  coerceDate,
  createSchema,
  parseNullable,
  parseNullableOptional,
  parseOptional,
  parseString,
  type Schema,
} from '../../primitives/schema';
import { sessionIdSchema, userIdSchema } from '../../primitives/schema/ids';

import type { SessionId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

/**
 * Full user session (matches DB SELECT result).
 *
 * @param id - Unique session identifier (UUID)
 * @param userId - Owner of the session (UUID)
 * @param ipAddress - Client IP at session creation
 * @param userAgent - Client user-agent string
 * @param deviceId - Optional device fingerprint
 * @param deviceName - Human-readable device label (e.g. "iPhone 15")
 * @param deviceType - Device category (e.g. "mobile", "desktop")
 * @param lastActiveAt - Last activity timestamp
 * @param revokedAt - Revocation timestamp (null if active)
 * @param createdAt - Session creation timestamp
 */
export interface UserSession {
  id: SessionId;
  userId: UserId;
  ipAddress: string | null;
  userAgent: string | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  lastActiveAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Input for creating a new session.
 */
export interface CreateUserSession {
  userId: UserId;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  deviceId?: string | null | undefined;
  deviceName?: string | null | undefined;
  deviceType?: string | null | undefined;
}

/**
 * Input for updating an existing session.
 */
export interface UpdateUserSession {
  lastActiveAt?: Date | undefined;
  revokedAt?: Date | null | undefined;
  deviceName?: string | null | undefined;
  deviceType?: string | null | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Full user session schema (matches DB SELECT result).
 */
export const userSessionSchema: Schema<UserSession> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: sessionIdSchema.parse(obj['id']),
    userId: userIdSchema.parse(obj['userId']),
    ipAddress: parseNullable(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    userAgent: parseNullable(obj['userAgent'], (v) => parseString(v, 'userAgent')),
    deviceId: parseNullable(obj['deviceId'], (v) => parseString(v, 'deviceId')),
    deviceName: parseNullable(obj['deviceName'], (v) => parseString(v, 'deviceName')),
    deviceType: parseNullable(obj['deviceType'], (v) => parseString(v, 'deviceType')),
    lastActiveAt: coerceDate(obj['lastActiveAt'], 'lastActiveAt'),
    revokedAt: parseNullable(obj['revokedAt'], (v) => coerceDate(v, 'revokedAt')),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new session.
 */
export const createUserSessionSchema: Schema<CreateUserSession> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    userId: userIdSchema.parse(obj['userId']),
    ipAddress: parseNullableOptional(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    userAgent: parseNullableOptional(obj['userAgent'], (v) => parseString(v, 'userAgent')),
    deviceId: parseNullableOptional(obj['deviceId'], (v) => parseString(v, 'deviceId')),
    deviceName: parseNullableOptional(obj['deviceName'], (v) => parseString(v, 'deviceName')),
    deviceType: parseNullableOptional(obj['deviceType'], (v) => parseString(v, 'deviceType')),
  };
});

/**
 * Schema for updating an existing session.
 */
export const updateUserSessionSchema: Schema<UpdateUserSession> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    lastActiveAt: parseOptional(obj['lastActiveAt'], (v) => coerceDate(v, 'lastActiveAt')),
    revokedAt: parseNullableOptional(obj['revokedAt'], (v) => coerceDate(v, 'revokedAt')),
    deviceName: parseNullableOptional(obj['deviceName'], (v) => parseString(v, 'deviceName')),
    deviceType: parseNullableOptional(obj['deviceType'], (v) => parseString(v, 'deviceType')),
  };
});
