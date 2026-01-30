// packages/notifications/src/handlers.ts
/**
 * Notification Handlers
 *
 * HTTP handlers for push notification endpoints.
 * Thin layer that validates input, calls services, and formats responses.
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * VAPID key, test notification, and send notification endpoints are stubbed.
 */

import { isAppError } from '@abe-stack/core';

import { getPreferences, subscribe, unsubscribe, updatePreferences } from './service';

import type { NotificationModuleDeps, NotificationRequest } from './types';
import type {
  PreferencesResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  VapidKeyResponse,
} from '@abe-stack/core';

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
    status: 501,
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
      status: 401,
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
      status: 201,
      body: {
        subscriptionId,
        message: 'Successfully subscribed to push notifications',
      },
    };
  } catch (error) {
    if (isAppError(error)) {
      const errorBody: { message: string; code?: string } = { message: error.message };
      if (error.code !== undefined) {
        errorBody.code = error.code;
      }
      return {
        status: 400,
        body: errorBody,
      };
    }

    ctx.log.error(
      { err: error as Error, handler: 'handleSubscribe', userId: req.user.userId },
      'Failed to subscribe',
    );
    return {
      status: 500,
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
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const removed = await unsubscribe(ctx.db, body.subscriptionId, body.endpoint);

    if (!removed) {
      return {
        status: 404,
        body: { message: 'Subscription not found', code: 'SUBSCRIPTION_NOT_FOUND' },
      };
    }

    return {
      status: 200,
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
      status: 500,
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
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const preferences = await getPreferences(ctx.db, req.user.userId);

    return {
      status: 200,
      body: { preferences },
    };
  } catch (error) {
    ctx.log.error(
      { err: error as Error, handler: 'handleGetPreferences', userId: req.user.userId },
      'Failed to get preferences',
    );
    return {
      status: 500,
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
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const preferences = await updatePreferences(ctx.db, req.user.userId, body);

    return {
      status: 200,
      body: { preferences },
    };
  } catch (error) {
    if (isAppError(error)) {
      const errorBody: { message: string; code?: string } = { message: error.message };
      if (error.code !== undefined) {
        errorBody.code = error.code;
      }
      return {
        status: 400,
        body: errorBody,
      };
    }

    ctx.log.error(
      { err: error as Error, handler: 'handleUpdatePreferences', userId: req.user.userId },
      'Failed to update preferences',
    );
    return {
      status: 500,
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
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  return {
    status: 500,
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
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  return {
    status: 500,
    body: {
      message: 'Push notification sending is not available. Provider not configured.',
      code: 'PROVIDER_NOT_CONFIGURED',
    },
  };
}
