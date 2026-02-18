// main/shared/src/contracts/contract.notifications.ts
/**
 * Notification Contracts
 *
 * API contracts for notification subscription and in-app notification routes.
 */

import {
  preferencesResponseSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
} from '../core/notifications/notifications.push.schemas';
import {
  baseMarkAsReadRequestSchema,
  notificationDeleteRequestSchema,
  notificationsListResponseSchema,
} from '../core/notifications/notifications.schemas';
import { errorResponseSchema, successResponseSchema } from '../system/http';
import { createSchema, parseString } from '../primitives/schema';


import type { Contract, Schema } from '../primitives/api';

const messageResponseSchema: Schema<{ message: string }> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { message: parseString(obj['message'], 'message', { min: 1 }) };
});

export const notificationsContract = {
  vapidKey: {
    method: 'GET' as const,
    path: '/api/notifications/vapid-key',
    responses: {
      200: successResponseSchema(vapidKeyResponseSchema),
      501: errorResponseSchema,
    },
    summary: 'Get VAPID public key',
  },
  subscribe: {
    method: 'POST' as const,
    path: '/api/notifications/subscribe',
    body: subscribeRequestSchema,
    responses: {
      201: successResponseSchema(subscribeResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Subscribe to push notifications',
  },
  unsubscribe: {
    method: 'POST' as const,
    path: '/api/notifications/unsubscribe',
    body: unsubscribeRequestSchema,
    responses: {
      200: successResponseSchema(unsubscribeResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unsubscribe from push notifications',
  },
  getPreferences: {
    method: 'GET' as const,
    path: '/api/notifications/preferences',
    responses: {
      200: successResponseSchema(preferencesResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get notification preferences',
  },
  updatePreferences: {
    method: 'PUT' as const,
    path: '/api/notifications/preferences/update',
    body: updatePreferencesRequestSchema,
    responses: {
      200: successResponseSchema(preferencesResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Update notification preferences',
  },
  testNotification: {
    method: 'POST' as const,
    path: '/api/notifications/test',
    responses: {
      200: successResponseSchema(messageResponseSchema),
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Send test notification to current user',
  },
  sendNotification: {
    method: 'POST' as const,
    path: '/api/notifications/send',
    body: sendNotificationRequestSchema,
    responses: {
      200: successResponseSchema(sendNotificationResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Send notification (admin)',
  },
  listNotifications: {
    method: 'GET' as const,
    path: '/api/notifications/list',
    responses: {
      200: successResponseSchema(notificationsListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List in-app notifications',
  },
  markRead: {
    method: 'POST' as const,
    path: '/api/notifications/mark-read',
    body: baseMarkAsReadRequestSchema,
    responses: {
      200: successResponseSchema(messageResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Mark notifications as read',
  },
  markAllRead: {
    method: 'POST' as const,
    path: '/api/notifications/mark-all-read',
    responses: {
      200: successResponseSchema(messageResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Mark all notifications as read',
  },
  deleteNotification: {
    method: 'POST' as const,
    path: '/api/notifications/delete',
    body: notificationDeleteRequestSchema,
    responses: {
      200: successResponseSchema(messageResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete notification',
  },
} satisfies Contract;
