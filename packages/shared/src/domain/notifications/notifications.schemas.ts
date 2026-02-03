// shared/src/domain/notifications/notifications.schemas.ts

/**
 * @file Notification Contracts
 * @description Types and schemas for system notifications.
 * @module Domain/Notifications
 */

import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';
import { notificationIdSchema, userIdSchema } from '../../types/ids';
import { cursorPaginatedResultSchema, cursorPaginationOptionsSchema } from '../../utils/pagination';

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// ============================================================================
// Schemas
// ============================================================================

/**
 * Standard Notification Schema.
 */
export const notificationSchema = z.object({
  id: notificationIdSchema,
  userId: userIdSchema,
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean().default(false),
  readAt: isoDateTimeSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

/**
 * Notification Preferences configuration.
 */
export const notificationPreferencesSchema = z.object({
  userId: userIdSchema,
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
  categories: z.record(z.boolean()).default({}), // e.g., { 'marketing': false, 'security': true }
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

// ============================================================================
// API Requests & Responses
// ============================================================================

/**
 * List request options for notifications.
 * Supports filtering by read status and type.
 */
export const notificationsListRequestSchema = cursorPaginationOptionsSchema.extend({
  isRead: z.boolean().optional(),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
});
export type NotificationsListRequest = z.infer<typeof notificationsListRequestSchema>;

export const notificationsListResponseSchema = cursorPaginatedResultSchema(notificationSchema);
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;

/**
 * Batch mark-as-read request.
 */
export const baseMarkAsReadRequestSchema = z.object({
  ids: z.array(notificationIdSchema).min(1),
});
export type BaseMarkAsReadRequest = z.infer<typeof baseMarkAsReadRequestSchema>;
