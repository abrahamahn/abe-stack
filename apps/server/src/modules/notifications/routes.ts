// apps/server/src/modules/notifications/routes.ts
/**
 * Notification Routes
 *
 * Route definitions for the notifications module.
 * Uses the generic router pattern for DRY registration.
 */

import {
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '@abe-stack/core';
import { protectedRoute, publicRoute, type RouteMap, type RouteResult } from '@router';

import {
  handleGetPreferences,
  handleGetVapidKey,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';

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
// Route Definitions
// ============================================================================

export const notificationRoutes: RouteMap = {
  // Public route - get VAPID key for client subscription
  'notifications/vapid-key': publicRoute<undefined, VapidKeyResponse | { message: string }>(
    'GET',
    (ctx: AppContext): Promise<RouteResult<VapidKeyResponse | { message: string }>> => {
      return Promise.resolve(handleGetVapidKey(ctx));
    },
  ),

  // Protected routes - require user authentication
  'notifications/subscribe': protectedRoute<
    SubscribeRequest,
    SubscribeResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: SubscribeRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<SubscribeResponse | { message: string }>> => {
      return handleSubscribe(ctx, body, req);
    },
    'user',
    subscribeRequestSchema,
  ),

  'notifications/unsubscribe': protectedRoute<
    UnsubscribeRequest,
    UnsubscribeResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: UnsubscribeRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<UnsubscribeResponse | { message: string }>> => {
      return handleUnsubscribe(ctx, body, req);
    },
    'user',
    unsubscribeRequestSchema,
  ),

  'notifications/preferences': protectedRoute<undefined, PreferencesResponse | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<PreferencesResponse | { message: string }>> => {
      return handleGetPreferences(ctx, _body, req);
    },
    'user',
  ),

  'notifications/preferences/update': protectedRoute<
    UpdatePreferencesRequest,
    PreferencesResponse | { message: string }
  >(
    'PUT',
    (
      ctx: AppContext,
      body: UpdatePreferencesRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<PreferencesResponse | { message: string }>> => {
      return handleUpdatePreferences(ctx, body, req);
    },
    'user',
    updatePreferencesRequestSchema,
  ),

  'notifications/test': protectedRoute<undefined, SendNotificationResponse | { message: string }>(
    'POST',
    (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<SendNotificationResponse | { message: string }>> => {
      return Promise.resolve(handleTestNotification(ctx, _body, req));
    },
    'user',
  ),

  // Admin routes - require admin authentication
  'notifications/send': protectedRoute<
    SendNotificationRequest,
    SendNotificationResponse | { message: string }
  >(
    'POST',
    (
      ctx: AppContext,
      body: SendNotificationRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<SendNotificationResponse | { message: string }>> => {
      return Promise.resolve(handleSendNotification(ctx, body, req));
    },
    'admin',
    sendNotificationRequestSchema,
  ),
};
