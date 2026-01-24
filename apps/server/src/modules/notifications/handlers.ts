// apps/server/src/modules/notifications/handlers.ts
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

import type {
  PreferencesResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  VapidKeyResponse,
} from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Type Definitions
// ============================================================================

type HandlerResult<T> =
  | { status: 200 | 201; body: T }
  | { status: 400 | 401 | 403 | 404 | 500 | 501; body: { message: string; code?: string } };

// ============================================================================
// Public Handlers (No auth required)
// ============================================================================

/**
 * Get VAPID public key for client subscription
 *
 * GET /api/notifications/vapid-key
 *
 * NOTE: Web Push (VAPID) support has been removed.
 * This endpoint returns a 501 Not Implemented status.
 */
export function handleGetVapidKey(_ctx: AppContext): HandlerResult<VapidKeyResponse> {
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
 * Subscribe to push notifications
 *
 * POST /api/notifications/subscribe
 */
export async function handleSubscribe(
  ctx: AppContext,
  body: SubscribeRequest,
  req: RequestWithCookies,
): Promise<HandlerResult<SubscribeResponse>> {
  if (!req.user) {
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
      return {
        status: 400,
        body: { message: error.message, code: error.code },
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
 * Unsubscribe from push notifications
 *
 * POST /api/notifications/unsubscribe
 */
export async function handleUnsubscribe(
  ctx: AppContext,
  body: UnsubscribeRequest,
  req: RequestWithCookies,
): Promise<HandlerResult<UnsubscribeResponse>> {
  if (!req.user) {
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
 * Get user notification preferences
 *
 * GET /api/notifications/preferences
 */
export async function handleGetPreferences(
  ctx: AppContext,
  _body: undefined,
  req: RequestWithCookies,
): Promise<HandlerResult<PreferencesResponse>> {
  if (!req.user) {
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
 * Update user notification preferences
 *
 * PUT /api/notifications/preferences
 */
export async function handleUpdatePreferences(
  ctx: AppContext,
  body: UpdatePreferencesRequest,
  req: RequestWithCookies,
): Promise<HandlerResult<PreferencesResponse>> {
  if (!req.user) {
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
      return {
        status: 400,
        body: { message: error.message, code: error.code },
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
 * Send test notification to self
 *
 * POST /api/notifications/test
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * This endpoint returns a 501 Not Implemented status.
 */
export function handleTestNotification(
  _ctx: AppContext,
  _body: undefined,
  req: RequestWithCookies,
): HandlerResult<{ message: string }> {
  if (!req.user) {
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

// ============================================================================
// Admin Handlers (Admin auth required)
// ============================================================================

/**
 * Send notification to specific users or broadcast
 *
 * POST /api/notifications/send
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * This endpoint returns a 501 Not Implemented status.
 */
export function handleSendNotification(
  _ctx: AppContext,
  _body: unknown,
  req: RequestWithCookies,
): HandlerResult<{ message: string }> {
  if (!req.user) {
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
