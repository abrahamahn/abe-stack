// main/server/core/src/webhooks/routes.ts
/**
 * Webhook Routes
 *
 * Route definitions for the webhooks module.
 * Uses the generic router pattern from @bslt/server-system.
 *
 * @module routes
 */

import { createWebhookSchema, emptyBodySchema, updateWebhookSchema } from '@bslt/shared';

import {
  createRouteMap,
  protectedRoute,
  type HandlerContext,
  type HttpRequest,
  type RouteMap,
  type RouteResult,
} from '../../../system/src';

import {
  handleCreateWebhook,
  handleDeleteWebhook,
  handleGetWebhook,
  handleListWebhooks,
  handleRotateSecret,
  handleUpdateWebhook,
} from './handlers';

import type {
  CreateWebhookData,
  UpdateWebhookData,
  WebhooksModuleDeps,
  WebhooksRequest,
} from './types';

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to WebhooksModuleDeps.
 * The server composition root ensures the context implements WebhooksModuleDeps.
 */
function asWebhooksDeps(ctx: HandlerContext): WebhooksModuleDeps {
  return ctx as unknown as WebhooksModuleDeps;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Webhook route map with all webhook management endpoints.
 *
 * Routes:
 * - `webhooks` (POST, user) - Create a new webhook
 * - `webhooks/list` (GET, user) - List tenant's webhooks
 * - `webhooks/:id` (GET, user) - Get a webhook by ID with delivery stats
 * - `webhooks/:id/update` (POST, user) - Update a webhook
 * - `webhooks/:id/delete` (POST, user) - Soft-delete a webhook
 * - `webhooks/:id/rotate-secret` (POST, user) - Rotate webhook secret
 */
export const webhookRoutes: RouteMap = createRouteMap([
  // Create a new webhook
  [
    'webhooks',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        return handleCreateWebhook(
          deps,
          tenantId,
          body as CreateWebhookData,
          req as unknown as WebhooksRequest,
        );
      },
      'user',
      createWebhookSchema,
      { summary: 'Create webhook', tags: ['Webhooks'] },
    ),
  ],

  // List tenant's webhooks
  [
    'webhooks/list',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        return handleListWebhooks(deps, tenantId, req as unknown as WebhooksRequest);
      },
      'user',
      undefined,
      { summary: 'List webhooks', tags: ['Webhooks'] },
    ),
  ],

  // Get a webhook by ID
  [
    'webhooks/:id',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        const webhookId = (req.params as { id: string }).id;
        return handleGetWebhook(deps, tenantId, webhookId, req as unknown as WebhooksRequest);
      },
      'user',
      undefined,
      { summary: 'Get webhook', tags: ['Webhooks'] },
    ),
  ],

  // Update a webhook
  [
    'webhooks/:id/update',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        const webhookId = (req.params as { id: string }).id;
        return handleUpdateWebhook(
          deps,
          tenantId,
          webhookId,
          body as UpdateWebhookData,
          req as unknown as WebhooksRequest,
        );
      },
      'user',
      updateWebhookSchema,
      { summary: 'Update webhook', tags: ['Webhooks'] },
    ),
  ],

  // Soft-delete a webhook
  [
    'webhooks/:id/delete',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        const webhookId = (req.params as { id: string }).id;
        return handleDeleteWebhook(deps, tenantId, webhookId, req as unknown as WebhooksRequest);
      },
      'user',
      emptyBodySchema,
      { summary: 'Delete webhook', tags: ['Webhooks'] },
    ),
  ],

  // Rotate webhook secret
  [
    'webhooks/:id/rotate-secret',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: HttpRequest): Promise<RouteResult> => {
        const deps = asWebhooksDeps(ctx);
        const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
        const webhookId = (req.params as { id: string }).id;
        return handleRotateSecret(deps, tenantId, webhookId, req as unknown as WebhooksRequest);
      },
      'user',
      emptyBodySchema,
      { summary: 'Rotate webhook secret', tags: ['Webhooks'] },
    ),
  ],
]);
