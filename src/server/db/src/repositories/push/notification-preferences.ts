// src/server/db/src/repositories/push/notification-preferences.ts
/**
 * Notification Preferences Repository (Functional)
 *
 * Data access layer for the notification_preferences table.
 * Manages per-user notification channel and type preferences.
 *
 * @module
 */

import { eq, select } from '../../builder/index';
import {
  type NewNotificationPreference,
  type NotificationPreference,
  type QuietHoursConfig,
  type TypePreferences,
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase, parseJsonb } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Notification Preference Repository Interface
// ============================================================================

/**
 * Functional repository for notification preference operations
 */
export interface NotificationPreferenceRepository {
  /**
   * Find notification preferences for a user
   * @param userId - The user ID to search for
   * @returns The preferences or null if none set
   */
  findByUserId(userId: string): Promise<NotificationPreference | null>;

  /**
   * Create or update notification preferences for a user
   * Uses INSERT ... ON CONFLICT for atomic upsert
   * @param data - The preference data
   * @returns The created or updated preferences
   * @throws Error if upsert fails
   */
  upsert(data: NewNotificationPreference): Promise<NotificationPreference>;
}

// ============================================================================
// Notification Preference Repository Implementation
// ============================================================================

/**
 * Transform raw database row to NotificationPreference type
 * Handles JSONB parsing for quietHours and types fields.
 * @param row - Raw database row with snake_case keys
 * @returns Typed NotificationPreference object
 * @complexity O(n) where n is number of columns
 */
function transformPreference(row: Record<string, unknown>): NotificationPreference {
  const pref = toCamelCase<NotificationPreference>(row, NOTIFICATION_PREFERENCE_COLUMNS);
  // Parse JSONB fields
  const parsedQuietHours = parseJsonb(
    row['quiet_hours'] as string | null,
  ) as QuietHoursConfig | null;
  if (parsedQuietHours !== null) {
    pref.quietHours = parsedQuietHours;
  }
  const parsedTypes = parseJsonb(row['types'] as string | null) as TypePreferences | null;
  if (parsedTypes !== null) {
    pref.types = parsedTypes;
  }
  return pref;
}

/**
 * Create a notification preference repository bound to a database connection
 * @param db - The raw database client
 * @returns NotificationPreferenceRepository implementation
 */
export function createNotificationPreferenceRepository(
  db: RawDb,
): NotificationPreferenceRepository {
  return {
    async findByUserId(userId: string): Promise<NotificationPreference | null> {
      const result = await db.queryOne(
        select(NOTIFICATION_PREFERENCES_TABLE).where(eq('user_id', userId)).toSql(),
      );
      return result !== null ? transformPreference(result) : null;
    },

    async upsert(data: NewNotificationPreference): Promise<NotificationPreference> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        NOTIFICATION_PREFERENCE_COLUMNS,
      );
      // Stringify JSONB fields
      if (data.quietHours !== undefined) {
        snakeData['quiet_hours'] = JSON.stringify(data.quietHours);
      }
      if (data.types !== undefined) {
        snakeData['types'] = JSON.stringify(data.types);
      }

      // Build upsert: INSERT ... ON CONFLICT (user_id) DO UPDATE
      const columns = Object.keys(snakeData);
      const placeholders = columns.map((_, i) => `$${String(i + 1)}`);
      const values = columns.map((col) => snakeData[col]);
      const updateCols = columns
        .filter((col) => col !== 'id' && col !== 'user_id')
        .map((col) => `${col} = EXCLUDED.${col}`);

      const text =
        `INSERT INTO ${NOTIFICATION_PREFERENCES_TABLE} (${columns.join(', ')}) ` +
        `VALUES (${placeholders.join(', ')}) ` +
        `ON CONFLICT (user_id) DO UPDATE SET ${updateCols.join(', ')} ` +
        `RETURNING *`;

      const result = await db.queryOne({ text, values });
      if (result === null) {
        throw new Error('Failed to upsert notification preferences');
      }
      return transformPreference(result);
    },
  };
}
