// main/server/core/src/notifications/handlers.ts
/**
 * Notification Handlers
 *
 * HTTP handlers for push notification endpoints.
 * Thin layer that validates input, calls services, and formats responses.
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * VAPID key, test notification, and send notification endpoints are stubbed.
 */

import { HTTP_STATUS, isAppError } from '@abe-stack/shared';

import { getPreferences, subscribe, unsubscribe, updatePreferences } from './service';

import type { NotificationModuleDeps, NotificationRequest } from './types';
import type {
  BaseMarkAsReadRequest,
  Notification,
  PreferencesResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  VapidKeyResponse,
} from '@abe-stack/shared';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Handler result type for notification endpoints.
 *
 * Discriminates between successful responses (200/201) and
 * error responses (400-501) with a message body.
 */
type HandlerResult<T> =
  | { status: 200 | 201; body: T }
  | { status: 400 | 401 | 403 | 404 | 500 | 501; body: { message: string; code?: string } };

// ============================================================================
// Public Handlers (No auth required)
// ============================================================================

/**
 * Get VAPID public key for client subscription.
 *
 * GET /api/notifications/vapid-key
 *
 * NOTE: Web Push (VAPID) support has been removed.
 * This endpoint returns a 501 Not Implemented status.
 *
 * @param _ctx - Notification module dependencies (unused)
 * @returns HandlerResult with 501 status
 */
export function handleGetVapidKey(_ctx: NotificationModuleDeps): HandlerResult<VapidKeyResponse> {
  return {
    status: HTTP_STATUS.NOT_IMPLEMENTED,
    body: {
      message: 'Web Push notifications are not available. VAPID keys not configured.',
      code: 'VAPID_NOT_CONFIGURED',
    },
  };
}

// ============================================================================
// Protected Handlers (User auth required)
// ============================================================================

/**
 * Subscribe to push notifications.
 *
 * POST /api/notifications/subscribe
 *
 * @param ctx - Notification module dependencies
 * @param body - Subscribe request body with subscription data, deviceId, userAgent
 * @param req - Request with authenticated user information
 * @returns HandlerResult with subscription ID or error
 */
export async function handleSubscribe(
  ctx: NotificationModuleDeps,
  body: SubscribeRequest,
  req: NotificationRequest,
): Promise<HandlerResult<SubscribeResponse>> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const subscriptionId = await subscribe(
      ctx.db,
      req.user.userId,
      body.subscription,
      body.deviceId,
      body.userAgent,
    );

    return {
      status: HTTP_STATUS.CREATED,
      body: {
        subscriptionId,
        message: 'Successfully subscribed to push notifications',
      },
    };
  } catch (error) {
    if (isAppError(error)) {
      const appError = error as Error & { code: string; statusCode: number };
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          message: appError.message,
          code: appError.code,
        },
      };
    }

    ctx.log.error(
      { err: error as Error, handler: 'handleSubscribe', userId: req.user.userId },
      'Failed to subscribe',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to subscribe' },
    };
  }
}

/**
 * Unsubscribe from push notifications.
 *
 * POST /api/notifications/unsubscribe
 *
 * @param ctx - Notification module dependencies
 * @param body - Unsubscribe request body with subscriptionId or endpoint
 * @param req - Request with authenticated user information
 * @returns HandlerResult indicating success or not-found
 */
export async function handleUnsubscribe(
  ctx: NotificationModuleDeps,
  body: UnsubscribeRequest,
  req: NotificationRequest,
): Promise<HandlerResult<UnsubscribeResponse>> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const removed = await unsubscribe(ctx.db, body.subscriptionId, body.endpoint);

    if (!removed) {
      return {
        status: HTTP_STATUS.NOT_FOUND,
        body: { message: 'Subscription not found', code: 'SUBSCRIPTION_NOT_FOUND' },
      };
    }

    return {
      status: HTTP_STATUS.OK,
      body: {
        success: true,
        message: 'Successfully unsubscribed from push notifications',
      },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleUnsubscribe', userId: req.user.userId },
      'Failed to unsubscribe',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to unsubscribe' },
    };
  }
}

/**
 * Get user notification preferences.
 *
 * GET /api/notifications/preferences
 *
 * @param ctx - Notification module dependencies
 * @param _body - Unused (GET request)
 * @param req - Request with authenticated user information
 * @returns HandlerResult with user preferences
 */
export async function handleGetPreferences(
  ctx: NotificationModuleDeps,
  _body: undefined,
  req: NotificationRequest,
): Promise<HandlerResult<PreferencesResponse>> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const preferences = await getPreferences(ctx.db, req.user.userId);

    return {
      status: HTTP_STATUS.OK,
      body: { preferences },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleGetPreferences', userId: req.user.userId },
      'Failed to get preferences',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to get preferences' },
    };
  }
}

/**
 * Update user notification preferences.
 *
 * PUT /api/notifications/preferences
 *
 * @param ctx - Notification module dependencies
 * @param body - Partial preference updates
 * @param req - Request with authenticated user information
 * @returns HandlerResult with updated preferences
 */
export async function handleUpdatePreferences(
  ctx: NotificationModuleDeps,
  body: UpdatePreferencesRequest,
  req: NotificationRequest,
): Promise<HandlerResult<PreferencesResponse>> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const preferences = await updatePreferences(ctx.db, req.user.userId, body);

    return {
      status: HTTP_STATUS.OK,
      body: { preferences },
    };
  } catch (error) {
    if (isAppError(error)) {
      const appError = error as Error & { code: string; statusCode: number };
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          message: appError.message,
          code: appError.code,
        },
      };
    }

    ctx.log.error(
      { err: error as Error, handler: 'handleUpdatePreferences', userId: req.user.userId },
      'Failed to update preferences',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to update preferences' },
    };
  }
}

/**
 * Send test notification to self.
 *
 * POST /api/notifications/test
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * This endpoint returns a 500 status indicating provider not configured.
 *
 * @param _ctx - Notification module dependencies (unused)
 * @param _body - Unused
 * @param req - Request with authenticated user information
 * @returns HandlerResult with error status
 */
export function handleTestNotification(
  _ctx: NotificationModuleDeps,
  _body: undefined,
  req: NotificationRequest,
): HandlerResult<{ message: string }> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: {
      message: 'Push notification sending is not available. Provider not configured.',
      code: 'PROVIDER_NOT_CONFIGURED',
    },
  };
}

/**
 * Send notification to specific users or broadcast.
 *
 * POST /api/notifications/send
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * This endpoint returns a 500 status indicating provider not configured.
 *
 * @param _ctx - Notification module dependencies (unused)
 * @param _body - Send notification request body (unused)
 * @param req - Request with authenticated admin user information
 * @returns HandlerResult with error status
 */
export function handleSendNotification(
  _ctx: NotificationModuleDeps,
  _body: unknown,
  req: NotificationRequest,
): HandlerResult<{ message: string }> {
  if (req.user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: {
      message: 'Push notification sending is not available. Provider not configured.',
      code: 'PROVIDER_NOT_CONFIGURED',
    },
  };
}

// ============================================================================
// In-App Notification Handlers
// ============================================================================

/** Response shape for the list notifications endpoint */
interface NotificationsListBody {
  notifications: Notification[];
  unreadCount: number;
}

/**
 * List in-app notifications for the authenticated user.
 *
 * GET /api/notifications/list
 *
 * Query params: limit (default 20), offset (default 0)
 *
 * @param ctx - Notification module dependencies
 * @param _body - Unused (GET request)
 * @param req - Request with authenticated user information
 * @returns HandlerResult with notifications array and unread count
 */
export async function handleListNotifications(
  ctx: NotificationModuleDeps,
  _body: undefined,
  req: NotificationRequest,
): Promise<HandlerResult<NotificationsListBody>> {
  if (req.user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    // Extract query params from the runtime request (FastifyRequest at runtime)
    const query = (req as unknown as { query: Record<string, string | undefined> }).query;
    const limitStr = query['limit'];
    const offsetStr = query['offset'];
    const parsedLimit = limitStr !== undefined ? parseInt(limitStr, 10) : NaN;
    const parsedOffset = offsetStr !== undefined ? parseInt(offsetStr, 10) : NaN;
    const limit = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const offset = !isNaN(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const [notifications, unreadCount] = await Promise.all([
      ctx.repos.notifications.findByUserId(req.user.userId, limit, offset),
      ctx.repos.notifications.countUnread(req.user.userId),
    ]);

    // Format DB dates to ISO strings for API response
    const formatted: Notification[] = notifications.map((n) => ({
      id: n.id as Notification['id'],
      userId: n.userId as Notification['userId'],
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? undefined,
      isRead: n.isRead,
      readAt: n.readAt instanceof Date ? n.readAt.toISOString() : undefined,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    }));

    return {
      status: HTTP_STATUS.OK,
      body: { notifications: formatted, unreadCount },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleListNotifications', userId: req.user.userId },
      'Failed to list notifications',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to list notifications' },
    };
  }
}

/**
 * Mark specific notifications as read.
 *
 * POST /api/notifications/mark-read
 *
 * @param ctx - Notification module dependencies
 * @param body - Request body with notification IDs
 * @param req - Request with authenticated user information
 * @returns HandlerResult with success message
 */
export async function handleMarkAsRead(
  ctx: NotificationModuleDeps,
  body: BaseMarkAsReadRequest,
  req: NotificationRequest,
): Promise<HandlerResult<{ message: string; count: number }>> {
  if (req.user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    let count = 0;
    for (const id of body.ids) {
      const result = await ctx.repos.notifications.markAsRead(id);
      if (result !== null) count++;
    }

    return {
      status: HTTP_STATUS.OK,
      body: { message: `Marked ${String(count)} notifications as read`, count },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleMarkAsRead', userId: req.user.userId },
      'Failed to mark notifications as read',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to mark notifications as read' },
    };
  }
}

/**
 * Mark all notifications as read for the authenticated user.
 *
 * POST /api/notifications/mark-all-read
 *
 * @param ctx - Notification module dependencies
 * @param _body - Unused
 * @param req - Request with authenticated user information
 * @returns HandlerResult with count of marked notifications
 */
export async function handleMarkAllAsRead(
  ctx: NotificationModuleDeps,
  _body: undefined,
  req: NotificationRequest,
): Promise<HandlerResult<{ message: string; count: number }>> {
  if (req.user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const count = await ctx.repos.notifications.markAllAsRead(req.user.userId);

    return {
      status: HTTP_STATUS.OK,
      body: { message: `Marked ${String(count)} notifications as read`, count },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleMarkAllAsRead', userId: req.user.userId },
      'Failed to mark all notifications as read',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to mark all notifications as read' },
    };
  }
}

/**
 * Delete a specific notification.
 *
 * POST /api/notifications/delete
 *
 * @param ctx - Notification module dependencies
 * @param body - Request body with notification ID
 * @param req - Request with authenticated user information
 * @returns HandlerResult with success status
 */
export async function handleDeleteNotification(
  ctx: NotificationModuleDeps,
  body: { id: string },
  req: NotificationRequest,
): Promise<HandlerResult<{ message: string }>> {
  if (req.user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const deleted = await ctx.repos.notifications.delete(body.id);

    if (!deleted) {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'Notification not found' } };
    }

    return {
      status: HTTP_STATUS.OK,
      body: { message: 'Notification deleted' },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleDeleteNotification', userId: req.user.userId },
      'Failed to delete notification',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to delete notification' },
    };
  }
}
