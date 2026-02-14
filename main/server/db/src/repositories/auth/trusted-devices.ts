// main/server/db/src/repositories/auth/trusted-devices.ts
/**
 * Trusted Devices Repository (Functional)
 *
 * Data access layer for the trusted_devices table.
 * Tracks known devices for security monitoring and device management.
 *
 * @module
 */

import { and, eq, insert, select, update, deleteFrom } from '../../builder/index';
import {
  type NewTrustedDevice,
  type TrustedDevice,
  type UpdateTrustedDevice,
  TRUSTED_DEVICE_COLUMNS,
  TRUSTED_DEVICES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Trusted Device Repository Interface
// ============================================================================

/**
 * Functional repository for trusted device operations
 */
export interface TrustedDeviceRepository {
  /**
   * Create a new trusted device record
   * @param data - The device data to insert
   * @returns The created device record
   * @throws Error if insert fails
   */
  create(data: NewTrustedDevice): Promise<TrustedDevice>;

  /**
   * Find all trusted devices for a user
   * @param userId - The user ID to search for
   * @returns Array of trusted devices, most recently seen first
   */
  findByUser(userId: string): Promise<TrustedDevice[]>;

  /**
   * Find a device by user ID and fingerprint
   * @param userId - The user ID
   * @param fingerprint - The device fingerprint hash
   * @returns The device or null if not found
   */
  findByFingerprint(userId: string, fingerprint: string): Promise<TrustedDevice | null>;

  /**
   * Find a device by its ID
   * @param id - The device ID
   * @returns The device or null if not found
   */
  findById(id: string): Promise<TrustedDevice | null>;

  /**
   * Mark a device as trusted by setting trusted_at
   * @param id - The device ID to trust
   * @returns The updated device or null if not found
   */
  markTrusted(id: string): Promise<TrustedDevice | null>;

  /**
   * Revoke (delete) a trusted device
   * @param id - The device ID to revoke
   * @returns True if the device was deleted
   */
  revoke(id: string): Promise<boolean>;

  /**
   * Update last_seen_at for a device
   * @param id - The device ID to update
   * @param data - The fields to update
   * @returns The updated device or null if not found
   */
  updateLastSeen(id: string, data: UpdateTrustedDevice): Promise<TrustedDevice | null>;

  /**
   * Upsert a device record: insert if new, update last_seen_at if exists
   * @param data - The device data to upsert
   * @returns The upserted device record
   * @throws Error if upsert fails
   */
  upsert(data: NewTrustedDevice): Promise<TrustedDevice>;
}

// ============================================================================
// Trusted Device Repository Implementation
// ============================================================================

/**
 * Transform raw database row to TrustedDevice type
 * @param row - Raw database row with snake_case keys
 * @returns Typed TrustedDevice object
 * @complexity O(n) where n is number of columns
 */
function transformTrustedDevice(row: Record<string, unknown>): TrustedDevice {
  return toCamelCase<TrustedDevice>(row, TRUSTED_DEVICE_COLUMNS);
}

/**
 * Create a trusted device repository bound to a database connection
 * @param db - The raw database client
 * @returns TrustedDeviceRepository implementation
 */
export function createTrustedDeviceRepository(db: RawDb): TrustedDeviceRepository {
  return {
    async create(data: NewTrustedDevice): Promise<TrustedDevice> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TRUSTED_DEVICE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TRUSTED_DEVICES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create trusted device');
      }
      return transformTrustedDevice(result);
    },

    async findByUser(userId: string): Promise<TrustedDevice[]> {
      const results = await db.query(
        select(TRUSTED_DEVICES_TABLE)
          .where(eq('user_id', userId))
          .orderBy('last_seen_at', 'desc')
          .toSql(),
      );
      return results.map(transformTrustedDevice);
    },

    async findByFingerprint(userId: string, fingerprint: string): Promise<TrustedDevice | null> {
      const result = await db.queryOne(
        select(TRUSTED_DEVICES_TABLE)
          .where(and(eq('user_id', userId), eq('device_fingerprint', fingerprint)))
          .toSql(),
      );
      return result !== null ? transformTrustedDevice(result) : null;
    },

    async findById(id: string): Promise<TrustedDevice | null> {
      const result = await db.queryOne(select(TRUSTED_DEVICES_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformTrustedDevice(result) : null;
    },

    async markTrusted(id: string): Promise<TrustedDevice | null> {
      const result = await db.queryOne(
        update(TRUSTED_DEVICES_TABLE)
          .set({ trusted_at: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformTrustedDevice(result) : null;
    },

    async revoke(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(TRUSTED_DEVICES_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async updateLastSeen(id: string, data: UpdateTrustedDevice): Promise<TrustedDevice | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TRUSTED_DEVICE_COLUMNS,
      );
      const result = await db.queryOne(
        update(TRUSTED_DEVICES_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformTrustedDevice(result) : null;
    },

    async upsert(data: NewTrustedDevice): Promise<TrustedDevice> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TRUSTED_DEVICE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TRUSTED_DEVICES_TABLE)
          .values(snakeData)
          .onConflictDoUpdate(
            ['user_id', 'device_fingerprint'],
            ['last_seen_at', 'ip_address', 'user_agent'],
          )
          .returningAll()
          .toSql(),
      );
      if (result === null) {
        throw new Error('Failed to upsert trusted device');
      }
      return transformTrustedDevice(result);
    },
  };
}
