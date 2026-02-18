// main/server/core/src/notifications/routes.ts
/**
 * Notification Routes
 *
 * Route definitions for the notifications module.
 * Uses the generic router pattern from @bslt/db for DRY registration.
 *
 * The handler context is narrowed from HandlerContext to NotificationModuleDeps
 * at the route definition boundary. At runtime, the server passes AppContext
 * (which satisfies NotificationModuleDeps) as the handler context.
 */

import {
  baseMarkAsReadRequestSchema,
  emptyBodySchema,
  notificationDeleteRequestSchema,
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '@bslt/shared';

import { createRouteMap, type HandlerContext, type RouteDefinition } from '../../../engine/src';

import {
  handleDeleteNotification,
  handleGetPreferences,
  handleGetVapidKey,
  handleListNotifications,
  handleMarkAllAsRead,
  handleMarkAsRead,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';

import type {
  BaseMarkAsReadRequest,
  EmptyBody,
  SendNotificationRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  UpdatePreferencesRequest,
} from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NotificationModuleDeps, NotificationRequest } from './types';

// ============================================================================
// Local Types
// ============================================================================

/**
 * Validation schema interface for request body parsing.
 * Must have both `parse` and `safeParse` to be compatible with db's RouteSchema.
 */
type ValidationSchema<T = unknown> = {
  parse(data: unknown): T;
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: Error };
};

// ============================================================================
// Route Helper
// ============================================================================

/**
 * Handler function type for notification routes.
 * Uses NotificationModuleDeps as context and NotificationRequest as request.
 * Returns RouteResult (unknown) since the registerRouteMap handler inspects
 * the { status, body } pattern at runtime.
 */
type NotificationHandler<TBody> = (
  ctx: NotificationModuleDeps,
  body: TBody,
  req: NotificationRequest,
  reply: FastifyReply,
) => unknown;

/**
 * Create a public notification route definition.
 *
 * Wraps the handler to bridge between @bslt/db's generic HandlerContext
 * and the notification module's NotificationModuleDeps. At runtime, the server
 * passes its AppContext (a superset of NotificationModuleDeps) as the context.
 *
 * @param method - HTTP method
 * @param handler - Notification handler function
 * @param schema - Optional validation schema
 * @returns RouteDefinition compatible with @bslt/db route map
 * @complexity O(1)
 */
function notificationPublicRoute<TBody>(
  method: RouteDefinition['method'],
  handler: NotificationHandler<TBody>,
  schema?: ValidationSchema<TBody>,
): RouteDefinition {
  const baseRoute: RouteDefinition = {
    method,
    isPublic: true,
    handler: (
      ctx: HandlerContext,
      body: unknown,
      request: FastifyRequest,
      reply: FastifyReply,
    ): unknown => {
      return handler(
        ctx as unknown as NotificationModuleDeps,
        body as TBody,
        request as unknown as NotificationRequest,
        reply,
      );
    },
  };

  return schema === undefined ? baseRoute : { ...baseRoute, schema };
}

/**
 * Create a protected notification route definition.
 *
 * Wraps the handler to bridge between @bslt/db's generic HandlerContext
 * and the notification module's NotificationModuleDeps. At runtime, the server
 * passes its AppContext (a superset of NotificationModuleDeps) as the context.
 *
 * @param method - HTTP method
 * @param handler - Notification handler function
 * @param roles - Required roles for access (e.g., ['admin'])
 * @param schema - Optional validation schema
 * @returns RouteDefinition with auth requirement
 * @complexity O(1)
 */
function notificationProtectedRoute<TBody>(
  method: RouteDefinition['method'],
  handler: NotificationHandler<TBody>,
  roles: string[] = [],
  schema?: ValidationSchema<TBody>,
): RouteDefinition {
  const baseRoute: RouteDefinition = {
    method,
    isPublic: false,
    handler: (
      ctx: HandlerContext,
      body: unknown,
      request: FastifyRequest,
      reply: FastifyReply,
    ): unknown => {
      return handler(
        ctx as unknown as NotificationModuleDeps,
        body as TBody,
        request as unknown as NotificationRequest,
        reply,
      );
    },
    roles,
  };

  return schema === undefined ? baseRoute : { ...baseRoute, schema };
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Notification module route map.
 *
 * Defines all notification-related HTTP routes with their handlers,
 * validation schemas, and auth requirements.
 *
 * Routes:
 * - GET  notifications/vapid-key           (public)  - Get VAPID public key
 * - POST notifications/subscribe           (user)    - Subscribe to push notifications
 * - POST notifications/unsubscribe         (user)    - Unsubscribe from push notifications
 * - GET  notifications/preferences         (user)    - Get notification preferences
 * - PUT  notifications/preferences/update  (user)    - Update notification preferences
 * - POST notifications/test               (user)    - Send test notification
 * - POST notifications/send               (admin)   - Send notification to users
 * - GET  notifications/list               (user)    - List in-app notifications
 * - POST notifications/mark-read          (user)    - Mark specific notifications as read
 * - POST notifications/mark-all-read      (user)    - Mark all notifications as read
 * - POST notifications/delete             (user)    - Delete a notification
 */
export const notificationRoutes = createRouteMap([
  // Public route - get VAPID key for client subscription
  [
    'notifications/vapid-key',
    notificationPublicRoute<undefined>('GET', (ctx) => handleGetVapidKey(ctx)),
  ],

  // Protected routes - require user authentication
  [
    'notifications/subscribe',
    notificationProtectedRoute<SubscribeRequest>(
      'POST',
      async (ctx, body, req) => handleSubscribe(ctx, body, req),
      ['user'],
      subscribeRequestSchema,
    ),
  ],

  [
    'notifications/unsubscribe',
    notificationProtectedRoute<UnsubscribeRequest>(
      'POST',
      async (ctx, body, req) => handleUnsubscribe(ctx, body, req),
      ['user'],
      unsubscribeRequestSchema,
    ),
  ],

  [
    'notifications/preferences',
    notificationProtectedRoute<undefined>(
      'GET',
      async (ctx, _body, req) => handleGetPreferences(ctx, _body, req),
      ['user'],
    ),
  ],

  [
    'notifications/preferences/update',
    notificationProtectedRoute<UpdatePreferencesRequest>(
      'PUT',
      (ctx, body, req) => handleUpdatePreferences(ctx, body, req),
      ['user'],
      updatePreferencesRequestSchema,
    ),
  ],

  [
    'notifications/test',
    notificationProtectedRoute<EmptyBody>(
      'POST',
      (ctx, _body, req) => handleTestNotification(ctx, undefined, req),
      ['user'],
      emptyBodySchema,
    ),
  ],

  // Admin routes - require admin authentication
  [
    'notifications/send',
    notificationProtectedRoute<SendNotificationRequest>(
      'POST',
      (ctx, body, req) => handleSendNotification(ctx, body, req),
      ['admin'],
      sendNotificationRequestSchema,
    ),
  ],

  // In-app notification routes
  [
    'notifications/list',
    notificationProtectedRoute<undefined>(
      'GET',
      async (ctx, _body, req) => handleListNotifications(ctx, _body, req),
      ['user'],
    ),
  ],

  [
    'notifications/mark-read',
    notificationProtectedRoute<BaseMarkAsReadRequest>(
      'POST',
      async (ctx, body, req) => handleMarkAsRead(ctx, body, req),
      ['user'],
      baseMarkAsReadRequestSchema,
    ),
  ],

  [
    'notifications/mark-all-read',
    notificationProtectedRoute<EmptyBody>(
      'POST',
      async (ctx, _body, req) => handleMarkAllAsRead(ctx, undefined, req),
      ['user'],
      emptyBodySchema,
    ),
  ],

  [
    'notifications/delete',
    notificationProtectedRoute<{ id: string }>(
      'POST',
      async (ctx, body, req) => handleDeleteNotification(ctx, body, req),
      ['user'],
      notificationDeleteRequestSchema,
    ),
  ],
]);
