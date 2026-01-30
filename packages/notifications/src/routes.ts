// packages/notifications/src/routes.ts
/**
 * Notification Routes
 *
 * Route definitions for the notifications module.
 * Uses the generic router pattern from @abe-stack/http for DRY registration.
 *
 * The handler context is narrowed from HandlerContext to NotificationModuleDeps
 * at the route definition boundary. At runtime, the server passes AppContext
 * (which satisfies NotificationModuleDeps) as the handler context.
 */

import {
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '@abe-stack/core';
import {
  createRouteMap,
  type BaseRouteDefinition,
  type HandlerContext,
  type RouteResult,
  type ValidationSchema,
} from '@abe-stack/http';

import {
  handleGetPreferences,
  handleGetVapidKey,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';

import type { NotificationModuleDeps, NotificationRequest } from './types';
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
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Helper
// ============================================================================

/**
 * Handler function type for notification routes.
 * Uses NotificationModuleDeps as context and NotificationRequest as request.
 */
type NotificationHandler<TBody, TResult> = (
  ctx: NotificationModuleDeps,
  body: TBody,
  req: NotificationRequest,
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;

/**
 * Create a public notification route definition.
 *
 * Wraps the handler to bridge between @abe-stack/http's generic HandlerContext
 * and the notification module's NotificationModuleDeps. At runtime, the server
 * passes its AppContext (a superset of NotificationModuleDeps) as the context.
 *
 * @param method - HTTP method
 * @param handler - Notification handler function
 * @param schema - Optional validation schema
 * @returns BaseRouteDefinition compatible with @abe-stack/http route map
 * @complexity O(1)
 */
function notificationPublicRoute<TBody, TResult>(
  method: BaseRouteDefinition['method'],
  handler: NotificationHandler<TBody, TResult>,
  schema?: ValidationSchema<TBody>,
): BaseRouteDefinition {
  const route: BaseRouteDefinition = {
    method,
    handler: (
      ctx: HandlerContext,
      body: unknown,
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      return handler(
        ctx as unknown as NotificationModuleDeps,
        body as TBody,
        request as unknown as NotificationRequest,
        reply,
      ) as Promise<RouteResult>;
    },
  };
  if (schema !== undefined) {
    route.schema = schema as ValidationSchema;
  }
  return route;
}

/**
 * Create a protected notification route definition.
 *
 * Wraps the handler to bridge between @abe-stack/http's generic HandlerContext
 * and the notification module's NotificationModuleDeps. At runtime, the server
 * passes its AppContext (a superset of NotificationModuleDeps) as the context.
 *
 * @param method - HTTP method
 * @param handler - Notification handler function
 * @param auth - Required auth level ('user' or 'admin')
 * @param schema - Optional validation schema
 * @returns BaseRouteDefinition with auth requirement
 * @complexity O(1)
 */
function notificationProtectedRoute<TBody, TResult>(
  method: BaseRouteDefinition['method'],
  handler: NotificationHandler<TBody, TResult>,
  auth: 'user' | 'admin' = 'user',
  schema?: ValidationSchema<TBody>,
): BaseRouteDefinition {
  const route: BaseRouteDefinition = {
    method,
    handler: (
      ctx: HandlerContext,
      body: unknown,
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      return handler(
        ctx as unknown as NotificationModuleDeps,
        body as TBody,
        request as unknown as NotificationRequest,
        reply,
      ) as Promise<RouteResult>;
    },
    auth,
  };
  if (schema !== undefined) {
    route.schema = schema as ValidationSchema;
  }
  return route;
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
 */
export const notificationRoutes = createRouteMap([
  // Public route - get VAPID key for client subscription
  [
    'notifications/vapid-key',
    notificationPublicRoute<undefined, VapidKeyResponse | { message: string }>(
      'GET',
      (ctx): Promise<RouteResult<VapidKeyResponse | { message: string }>> => {
        return Promise.resolve(handleGetVapidKey(ctx));
      },
    ),
  ],

  // Protected routes - require user authentication
  [
    'notifications/subscribe',
    notificationProtectedRoute<SubscribeRequest, SubscribeResponse | { message: string }>(
      'POST',
      async (ctx, body, req): Promise<RouteResult<SubscribeResponse | { message: string }>> => {
        return handleSubscribe(ctx, body, req);
      },
      'user',
      subscribeRequestSchema,
    ),
  ],

  [
    'notifications/unsubscribe',
    notificationProtectedRoute<UnsubscribeRequest, UnsubscribeResponse | { message: string }>(
      'POST',
      async (ctx, body, req): Promise<RouteResult<UnsubscribeResponse | { message: string }>> => {
        return handleUnsubscribe(ctx, body, req);
      },
      'user',
      unsubscribeRequestSchema,
    ),
  ],

  [
    'notifications/preferences',
    notificationProtectedRoute<undefined, PreferencesResponse | { message: string }>(
      'GET',
      async (ctx, _body, req): Promise<RouteResult<PreferencesResponse | { message: string }>> => {
        return handleGetPreferences(ctx, _body, req);
      },
      'user',
    ),
  ],

  [
    'notifications/preferences/update',
    notificationProtectedRoute<UpdatePreferencesRequest, PreferencesResponse | { message: string }>(
      'PUT',
      (ctx, body, req): Promise<RouteResult<PreferencesResponse | { message: string }>> => {
        return handleUpdatePreferences(ctx, body, req);
      },
      'user',
      updatePreferencesRequestSchema,
    ),
  ],

  [
    'notifications/test',
    notificationProtectedRoute<undefined, SendNotificationResponse | { message: string }>(
      'POST',
      (ctx, _body, req): Promise<RouteResult<SendNotificationResponse | { message: string }>> => {
        return Promise.resolve(handleTestNotification(ctx, _body, req));
      },
      'user',
    ),
  ],

  // Admin routes - require admin authentication
  [
    'notifications/send',
    notificationProtectedRoute<
      SendNotificationRequest,
      SendNotificationResponse | { message: string }
    >(
      'POST',
      (ctx, body, req): Promise<RouteResult<SendNotificationResponse | { message: string }>> => {
        return Promise.resolve(handleSendNotification(ctx, body, req));
      },
      'admin',
      sendNotificationRequestSchema,
    ),
  ],
]);
