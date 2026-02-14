// main/shared/src/domain/notifications/notifications.schemas.ts

/**
 * @file Notification Contracts
 * @description Types and schemas for system notifications.
 * @module Domain/Notifications
 */

import {
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseRecord,
  parseString,
  withDefault,
} from '../../core/schema.utils';
import { isoDateTimeSchema } from '../../core/schemas';
import { notificationIdSchema, userIdSchema } from '../../types/ids';
import { cursorPaginationOptionsSchema } from '../../utils/pagination';

import type { Schema } from '../../core/api';
import type { NotificationId, UserId } from '../../types/ids';
import type { CursorPaginationOptions } from '../../utils/pagination';

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/**
 * Severity levels for in-app notifications (must match DB NotificationLevel in notifications.ts).
 * Aliased as NOTIFICATION_LEVELS to match DB naming convention.
 */
export const NOTIFICATION_LEVELS = ['info', 'success', 'warning', 'error'] as const;

/** Notification level type matching DB NotificationLevel */
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

/** Notification type enum schema */
const notificationTypeSchema = createEnumSchema(NOTIFICATION_LEVELS, 'notification type');

// ============================================================================
// Types
// ============================================================================

/** Standard notification entity */
export interface Notification {
  id: NotificationId;
  userId: UserId;
  type: NotificationLevel;
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
  type?: NotificationLevel | undefined;
}

/** In-app notifications list response */
export interface NotificationsListResponse {
  notifications: Notification[];
  unreadCount: number;
}

/** Batch mark-as-read request */
export interface BaseMarkAsReadRequest {
  ids: NotificationId[];
}

/** Delete notification request */
export interface NotificationDeleteRequest {
  id: string;
}

/** Mark-as-read mutation response */
export interface MarkReadResponse {
  message: string;
  count: number;
}

/** Delete notification mutation response */
export interface DeleteNotificationResponse {
  message: string;
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

export const notificationsListResponseSchema: Schema<NotificationsListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const rawNotifications = obj['notifications'];
    if (!Array.isArray(rawNotifications)) {
      throw new Error('notifications must be an array');
    }
    return {
      notifications: rawNotifications.map((item: unknown) => notificationSchema.parse(item)),
      unreadCount: parseNumber(obj['unreadCount'], 'unreadCount', { int: true, min: 0 }),
    };
  },
);

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

/**
 * Delete notification request.
 */
export const notificationDeleteRequestSchema: Schema<NotificationDeleteRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { id: parseString(obj['id'], 'id', { min: 1 }) };
  },
);

/**
 * Mark-as-read response schema.
 */
export const markReadResponseSchema: Schema<MarkReadResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    message: parseString(obj['message'], 'message'),
    count: parseNumber(obj['count'], 'count', { int: true, min: 0 }),
  };
});

/**
 * Delete notification response schema.
 */
export const deleteNotificationResponseSchema: Schema<DeleteNotificationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
    };
  },
);
