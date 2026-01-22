// apps/server/src/modules/notifications/handlers.ts
/**
 * Notification Handlers
 *
 * HTTP handlers for push notification endpoints.
 * Thin layer that validates input, calls services, and formats responses.
 */

import { randomUUID } from 'crypto';

import { isAppError, VapidNotConfiguredError } from '@abe-stack/core';
import { getNotificationService } from '@infrastructure/notifications';

import {
  broadcast,
  getPreferences,
  getVapidPublicKey,
  sendToUser,
  sendToUsers,
  subscribe,
  unsubscribe,
  updatePreferences,
} from './service';

import type {
  PreferencesResponse,
  SendNotificationRequest,
  SendNotificationResponse,
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
  | { status: 400 | 401 | 403 | 404 | 500; body: { message: string; code?: string } };

// ============================================================================
// Public Handlers (No auth required)
// ============================================================================

/**
 * Get VAPID public key for client subscription
 *
 * GET /api/notifications/vapid-key
 */
export function handleGetVapidKey(ctx: AppContext): HandlerResult<VapidKeyResponse> {
  try {
    const notificationService = getNotificationService();
    const publicKey = getVapidPublicKey(notificationService);

    return {
      status: 200,
      body: { publicKey },
    };
  } catch (error) {
    if (error instanceof VapidNotConfiguredError) {
      return {
        status: 500,
        body: { message: error.message, code: error.code },
      };
    }

    ctx.log.error({ err: error as Error, handler: 'handleGetVapidKey' }, 'Failed to get VAPID key');
    return {
      status: 500,
      body: { message: 'Failed to get VAPID key' },
    };
  }
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
 */
export async function handleTestNotification(
  ctx: AppContext,
  _body: undefined,
  req: RequestWithCookies,
): Promise<HandlerResult<SendNotificationResponse>> {
  if (!req.user) {
    return {
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const notificationService = getNotificationService();
    const result = await sendToUser(ctx.db, notificationService, req.user.userId, {
      title: 'Test Notification',
      body: 'This is a test notification from your app.',
      icon: '/icons/icon-192.png',
      data: { type: 'test', timestamp: Date.now() },
    });

    return {
      status: 200,
      body: {
        messageId: randomUUID(),
        result,
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
      { err: error as Error, handler: 'handleTestNotification', userId: req.user.userId },
      'Failed to send test notification',
    );
    return {
      status: 500,
      body: { message: 'Failed to send test notification' },
    };
  }
}

// ============================================================================
// Admin Handlers (Admin auth required)
// ============================================================================

/**
 * Send notification to specific users or broadcast
 *
 * POST /api/notifications/send
 */
export async function handleSendNotification(
  ctx: AppContext,
  body: SendNotificationRequest,
  req: RequestWithCookies,
): Promise<HandlerResult<SendNotificationResponse>> {
  if (!req.user) {
    return {
      status: 401,
      body: { message: 'Unauthorized' },
    };
  }

  try {
    const notificationService = getNotificationService();
    const messageId = randomUUID();

    let result;

    if (body.userIds && body.userIds.length > 0) {
      // Send to specific users
      result = await sendToUsers(ctx.db, notificationService, body.userIds, body.payload, {
        ttl: body.ttl,
        topic: body.topic,
      });
    } else {
      // Broadcast to all
      result = await broadcast(ctx.db, notificationService, body.payload, {
        ttl: body.ttl,
        topic: body.topic,
      });
    }

    ctx.log.info(
      {
        messageId,
        type: body.type,
        priority: body.priority,
        targetCount: body.userIds?.length ?? 'broadcast',
        successful: result.successful,
        failed: result.failed,
      },
      'Notification sent',
    );

    return {
      status: 200,
      body: { messageId, result },
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        status: 400,
        body: { message: error.message, code: error.code },
      };
    }

    ctx.log.error(
      { err: error as Error, handler: 'handleSendNotification' },
      'Failed to send notification',
    );
    return {
      status: 500,
      body: { message: 'Failed to send notification' },
    };
  }
}
