// main/server/db/src/schema/trusted-devices.ts
/**
 * Trusted Devices Schema Types
 *
 * TypeScript interfaces for the trusted_devices table.
 * Maps to migration 0001_auth_extensions.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const TRUSTED_DEVICES_TABLE = 'trusted_devices';

// ============================================================================
// Trusted Device Types
// ============================================================================

/**
 * Trusted device record (SELECT result).
 * Tracks devices a user has logged in from for security monitoring.
 *
 * @see 0001_auth_extensions.sql
 */
export interface TrustedDevice {
  id: string;
  userId: string;
  deviceFingerprint: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  trustedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new trusted device (INSERT).
 */
export interface NewTrustedDevice {
  id?: string;
  userId: string;
  deviceFingerprint: string;
  label?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  trustedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing trusted device (UPDATE).
 */
export interface UpdateTrustedDevice {
  label?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastSeenAt?: Date;
  trustedAt?: Date | null;
}

// ============================================================================
// Column Name Mappings (camelCase TS -> snake_case SQL)
// ============================================================================

export const TRUSTED_DEVICE_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  deviceFingerprint: 'device_fingerprint',
  label: 'label',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  firstSeenAt: 'first_seen_at',
  lastSeenAt: 'last_seen_at',
  trustedAt: 'trusted_at',
  createdAt: 'created_at',
} as const;
