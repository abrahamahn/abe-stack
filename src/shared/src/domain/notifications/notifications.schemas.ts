// src/shared/src/domain/notifications/notifications.schemas.ts

/**
 * @file Notification Contracts
 * @description Types and schemas for system notifications.
 * @module Domain/Notifications
 */

import { isoDateTimeSchema } from '../../contracts/common';
import {
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullableOptional,
  parseOptional,
  parseRecord,
  parseString,
  withDefault,
} from '../../contracts/schema';
import { notificationIdSchema, userIdSchema } from '../../types/ids';
import { cursorPaginatedResultSchema, cursorPaginationOptionsSchema } from '../../utils/pagination';

import type { Schema } from '../../contracts/types';
import type { NotificationId, UserId } from '../../types/ids';
import type { CursorPaginatedResult, CursorPaginationOptions } from '../../utils/pagination';

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/** Notification type values */
const NOTIFICATION_TYPE_VALUES = ['info', 'success', 'warning', 'error'] as const;

/** Notification type enum schema */
const notificationTypeSchema = createEnumSchema(NOTIFICATION_TYPE_VALUES, 'notification type');

// ============================================================================
// Types
// ============================================================================

/** Notification type value */
type NotificationTypeValue = (typeof NOTIFICATION_TYPE_VALUES)[number];

/** Standard notification entity */
export interface Notification {
  id: NotificationId;
  userId: UserId;
  type: NotificationTypeValue;
  title: string;
  message: string;
  data?: Record<string, unknown> | undefined;
  isRead: boolean;
  readAt?: string | null | undefined;
  createdAt: string;
}

/**
 * Simple notification preferences for in-app notifications.
 *
 * Tracks global email/push toggles and per-category overrides.
 * For the richer push notification preferences (with quiet hours,
 * per-type channel configuration, etc.), see `NotificationPreferences`
 * in `notifications.types.ts`.
 */
export interface NotificationPreferencesConfig {
  userId: UserId;
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<string, boolean>;
}

/** List request options for notifications */
export interface NotificationsListRequest extends CursorPaginationOptions {
  isRead?: boolean | undefined;
  type?: NotificationTypeValue | undefined;
}

/** Paginated list response for notifications */
export type NotificationsListResponse = CursorPaginatedResult<Notification>;

/** Batch mark-as-read request */
export interface BaseMarkAsReadRequest {
  ids: NotificationId[];
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Standard Notification Schema.
 */
export const notificationSchema: Schema<Notification> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: notificationIdSchema.parse(obj['id']),
    userId: userIdSchema.parse(obj['userId']),
    type: notificationTypeSchema.parse(obj['type']),
    title: parseString(obj['title'], 'title'),
    message: parseString(obj['message'], 'message'),
    data: parseOptional(obj['data'], (v) => parseRecord(v, 'data')),
    isRead: parseBoolean(withDefault(obj['isRead'], false), 'isRead'),
    readAt: parseNullableOptional(obj['readAt'], (v) => isoDateTimeSchema.parse(v)),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

/**
 * Notification Preferences configuration.
 */
export const notificationPreferencesSchema: Schema<NotificationPreferencesConfig> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const rawCategories = withDefault(obj['categories'], {});
    const categories: Record<string, boolean> = {};
    if (
      rawCategories !== null &&
      typeof rawCategories === 'object' &&
      !Array.isArray(rawCategories)
    ) {
      const catObj = rawCategories as Record<string, unknown>;
      for (const key of Object.keys(catObj)) {
        categories[key] = parseBoolean(catObj[key], `categories.${key}`);
      }
    }

    return {
      userId: userIdSchema.parse(obj['userId']),
      emailEnabled: parseBoolean(withDefault(obj['emailEnabled'], true), 'emailEnabled'),
      pushEnabled: parseBoolean(withDefault(obj['pushEnabled'], false), 'pushEnabled'),
      categories,
    };
  },
);

// ============================================================================
// API Requests & Responses
// ============================================================================

/**
 * List request options for notifications.
 * Supports filtering by read status and type.
 */
export const notificationsListRequestSchema: Schema<NotificationsListRequest> = createSchema(
  (data: unknown) => {
    const base = cursorPaginationOptionsSchema.parse(data);
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      ...base,
      isRead: parseOptional(obj['isRead'], (v) => parseBoolean(v, 'isRead')),
      type: parseOptional(obj['type'], (v) => notificationTypeSchema.parse(v)),
    };
  },
);

export const notificationsListResponseSchema: Schema<NotificationsListResponse> =
  cursorPaginatedResultSchema(notificationSchema);

/**
 * Batch mark-as-read request.
 */
export const baseMarkAsReadRequestSchema: Schema<BaseMarkAsReadRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const rawIds = obj['ids'];
    if (!Array.isArray(rawIds)) {
      throw new Error('ids must be an array');
    }
    if (rawIds.length < 1) {
      throw new Error('ids must have at least 1 item');
    }
    const ids = rawIds.map((item: unknown) => notificationIdSchema.parse(item));

    return { ids };
  },
);
