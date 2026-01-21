// packages/core/src/domains/notifications/schemas.ts
/**
 * Push Notification Validation Schemas
 *
 * Zod schemas for validating notification-related requests and data.
 */

import { z } from 'zod';

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Notification type enum values
 */
export const NOTIFICATION_TYPES = [
  'system',
  'security',
  'marketing',
  'social',
  'transactional',
] as const;

/**
 * Notification channel enum values
 */
export const NOTIFICATION_CHANNELS = ['push', 'email', 'sms', 'in_app'] as const;

/**
 * Notification priority enum values
 */
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

/**
 * Notification type schema
 */
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

/**
 * Notification channel schema
 */
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

/**
 * Notification priority schema
 */
export const notificationPrioritySchema = z.enum(NOTIFICATION_PRIORITIES);

// ============================================================================
// Push Subscription Schemas
// ============================================================================

/**
 * Push subscription keys schema
 */
export const pushSubscriptionKeysSchema = z.object({
  p256dh: z
    .string()
    .min(1, 'p256dh key is required')
    .regex(/^[A-Za-z0-9_-]+$/, 'p256dh must be base64url encoded'),
  auth: z
    .string()
    .min(1, 'auth key is required')
    .regex(/^[A-Za-z0-9_-]+$/, 'auth must be base64url encoded'),
});

/**
 * Push subscription schema (from browser)
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url('endpoint must be a valid URL'),
  expirationTime: z.number().nullable(),
  keys: pushSubscriptionKeysSchema,
});

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Subscribe request schema
 */
export const subscribeRequestSchema = z.object({
  subscription: pushSubscriptionSchema,
  deviceId: z.string().min(1, 'deviceId is required').max(255, 'deviceId is too long'),
  userAgent: z.string().max(1024, 'userAgent is too long').default(''),
});

/**
 * Unsubscribe request schema
 */
export const unsubscribeRequestSchema = z
  .object({
    subscriptionId: z.uuid('subscriptionId must be a valid UUID').optional(),
    endpoint: z.url('endpoint must be a valid URL').optional(),
  })
  .refine((data) => data.subscriptionId !== undefined || data.endpoint !== undefined, {
    message: 'Either subscriptionId or endpoint is required',
  });

/**
 * Quiet hours configuration schema
 */
export const quietHoursSchema = z.object({
  enabled: z.boolean().optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().max(64).optional(),
});

/**
 * Notification type preference schema
 */
export const notificationTypePreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  channels: z.array(notificationChannelSchema).optional(),
});

/**
 * Update preferences request schema
 * Uses partial record to allow updating only specific notification types
 */
export const updatePreferencesRequestSchema = z.object({
  globalEnabled: z.boolean().optional(),
  quietHours: quietHoursSchema.optional(),
  types: z
    .object({
      system: notificationTypePreferenceSchema.optional(),
      security: notificationTypePreferenceSchema.optional(),
      marketing: notificationTypePreferenceSchema.optional(),
      social: notificationTypePreferenceSchema.optional(),
      transactional: notificationTypePreferenceSchema.optional(),
    })
    .optional(),
});

/**
 * Notification action schema
 */
export const notificationActionSchema = z.object({
  action: z.string().min(1).max(64),
  title: z.string().min(1).max(128),
  icon: z.url().optional(),
});

/**
 * Notification payload schema
 */
export const notificationPayloadSchema = z.object({
  title: z.string().min(1, 'title is required').max(128, 'title is too long'),
  body: z.string().min(1, 'body is required').max(4096, 'body is too long'),
  icon: z.url().optional(),
  badge: z.url().optional(),
  image: z.url().optional(),
  tag: z.string().max(64).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(notificationActionSchema).max(3).optional(),
  requireInteraction: z.boolean().optional(),
  renotify: z.boolean().optional(),
  silent: z.boolean().optional(),
  vibrate: z.array(z.number().int().min(0).max(10000)).max(10).optional(),
  timestamp: z.number().int().positive().optional(),
  url: z.url().optional(),
});

/**
 * Send notification request schema
 */
export const sendNotificationRequestSchema = z.object({
  type: notificationTypeSchema,
  priority: notificationPrioritySchema.default('normal'),
  payload: notificationPayloadSchema,
  userIds: z.array(z.uuid()).optional(),
  topic: z.string().max(128).optional(),
  ttl: z.number().int().min(0).max(2419200).optional(), // Max 28 days
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Subscribe response schema
 */
export const subscribeResponseSchema = z.object({
  subscriptionId: z.uuid(),
  message: z.string(),
});

/**
 * Unsubscribe response schema
 */
export const unsubscribeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Send result schema
 */
export const sendResultSchema = z.object({
  success: z.boolean(),
  subscriptionId: z.string(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
});

/**
 * Batch send result schema
 */
export const batchSendResultSchema = z.object({
  total: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(sendResultSchema),
  expiredSubscriptions: z.array(z.string()),
});

/**
 * Send notification response schema
 */
export const sendNotificationResponseSchema = z.object({
  messageId: z.uuid(),
  result: batchSendResultSchema,
});

/**
 * VAPID key response schema
 */
export const vapidKeyResponseSchema = z.object({
  publicKey: z.string().min(1),
});

/**
 * Notification preferences response schema
 */
export const preferencesResponseSchema = z.object({
  preferences: z.object({
    userId: z.uuid(),
    globalEnabled: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
      timezone: z.string(),
    }),
    types: z.record(
      notificationTypeSchema,
      z.object({
        enabled: z.boolean(),
        channels: z.array(notificationChannelSchema),
      }),
    ),
    updatedAt: z.date(),
  }),
});

// ============================================================================
// Type Exports (Inferred from schemas)
// ============================================================================

export type SubscribeRequestSchema = z.infer<typeof subscribeRequestSchema>;
export type UnsubscribeRequestSchema = z.infer<typeof unsubscribeRequestSchema>;
export type UpdatePreferencesRequestSchema = z.infer<typeof updatePreferencesRequestSchema>;
export type SendNotificationRequestSchema = z.infer<typeof sendNotificationRequestSchema>;
export type NotificationPayloadSchema = z.infer<typeof notificationPayloadSchema>;
