// packages/db/src/schema/sessions.ts
/**
 * User Sessions Schema Types
 *
 * TypeScript interfaces for the user_sessions table.
 * Maps to migration 0002_sessions.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const USER_SESSIONS_TABLE = 'user_sessions';

// ============================================================================
// User Session Types
// ============================================================================

/**
 * User session record (SELECT result).
 * Tracks active login sessions for device list and revocation.
 *
 * @see 0002_sessions.sql
 */
export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceId: string | null;
  lastActiveAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new user session.
 */
export interface NewUserSession {
  id?: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  lastActiveAt?: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing session.
 * Only activity tracking and revocation state can change.
 */
export interface UpdateUserSession {
  lastActiveAt?: Date;
  revokedAt?: Date | null;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const USER_SESSION_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  deviceId: 'device_id',
  lastActiveAt: 'last_active_at',
  revokedAt: 'revoked_at',
  createdAt: 'created_at',
} as const;
