// main/server/core/src/webhooks/handlers.ts
/**
 * Webhook Handlers
 *
 * HTTP handlers for webhook management operations.
 * Thin layer that validates auth, calls services, and formats responses.
 *
 * @module handlers
 */

import { HTTP_STATUS, mapErrorToHttpResponse } from '@bslt/shared';

import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  listDeliveries,
  listWebhooks,
  replayDelivery,
  rotateWebhookSecret,
  updateWebhook,
} from './service';
import { ERROR_MESSAGES } from './types';

import type {
  CreateWebhookData,
  UpdateWebhookData,
  WebhooksModuleDeps,
  WebhooksRequest,
} from './types';
import type { HttpErrorResponse } from '@bslt/shared';

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle creating a new webhook subscription.
 * POST /api/webhooks
 */
export async function handleCreateWebhook(
  deps: WebhooksModuleDeps,
  tenantId: string,
  body: CreateWebhookData,
  request: WebhooksRequest,
): Promise<{ status: 201; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const webhook = await createWebhook(deps.repos, tenantId, userId, body);

    return { status: HTTP_STATUS.CREATED, body: webhook };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle listing all webhooks for a tenant.
 * GET /api/webhooks
 */
export async function handleListWebhooks(
  deps: WebhooksModuleDeps,
  tenantId: string,
  request: WebhooksRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const webhooks = await listWebhooks(deps.repos, tenantId);
    return { status: HTTP_STATUS.OK, body: webhooks };
  } catch (error) {
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to list webhooks',
    );
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: ERROR_MESSAGES.INTERNAL_ERROR },
    };
  }
}

/**
 * Handle getting a single webhook by ID with delivery stats.
 * GET /api/webhooks/:id
 */
export async function handleGetWebhook(
  deps: WebhooksModuleDeps,
  tenantId: string,
  webhookId: string,
  request: WebhooksRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const webhook = await getWebhook(deps.repos, webhookId, tenantId);
    return { status: HTTP_STATUS.OK, body: webhook };
  } catch (error) {
    if (error instanceof Error && error.message === 'Webhook not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: ERROR_MESSAGES.WEBHOOK_NOT_FOUND } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle updating a webhook.
 * PATCH /api/webhooks/:id
 */
export async function handleUpdateWebhook(
  deps: WebhooksModuleDeps,
  tenantId: string,
  webhookId: string,
  body: UpdateWebhookData,
  request: WebhooksRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const webhook = await updateWebhook(deps.repos, webhookId, tenantId, body);
    return { status: HTTP_STATUS.OK, body: webhook };
  } catch (error) {
    if (error instanceof Error && error.message === 'Webhook not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: ERROR_MESSAGES.WEBHOOK_NOT_FOUND } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle deleting (soft-delete) a webhook.
 * DELETE /api/webhooks/:id
 */
export async function handleDeleteWebhook(
  deps: WebhooksModuleDeps,
  tenantId: string,
  webhookId: string,
  request: WebhooksRequest,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    await deleteWebhook(deps.repos, webhookId, tenantId);
    return { status: HTTP_STATUS.OK, body: { message: 'Webhook deleted' } };
  } catch (error) {
    if (error instanceof Error && error.message === 'Webhook not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: ERROR_MESSAGES.WEBHOOK_NOT_FOUND } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle listing deliveries for a webhook.
 * GET /api/webhooks/:id/deliveries
 */
export async function handleListDeliveries(
  deps: WebhooksModuleDeps,
  tenantId: string,
  webhookId: string,
  request: WebhooksRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const deliveries = await listDeliveries(deps.repos, webhookId, tenantId);
    return { status: HTTP_STATUS.OK, body: { deliveries } };
  } catch (error) {
    if (error instanceof Error && error.message === 'Webhook not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: ERROR_MESSAGES.WEBHOOK_NOT_FOUND } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle replaying a webhook delivery.
 * POST /api/webhooks/deliveries/:deliveryId/replay
 */
export async function handleReplayDelivery(
  deps: WebhooksModuleDeps,
  tenantId: string,
  deliveryId: string,
  request: WebhooksRequest,
): Promise<{ status: 201; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const delivery = await replayDelivery(deps.repos, deliveryId, tenantId);
    return { status: HTTP_STATUS.CREATED, body: { delivery } };
  } catch (error) {
    if (error instanceof Error && error.message === 'Delivery not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: 'Delivery not found' } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}

/**
 * Handle rotating a webhook's shared secret.
 * POST /api/webhooks/:id/rotate-secret
 */
export async function handleRotateSecret(
  deps: WebhooksModuleDeps,
  tenantId: string,
  webhookId: string,
  request: WebhooksRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const webhook = await rotateWebhookSecret(deps.repos, webhookId, tenantId);
    return { status: HTTP_STATUS.OK, body: webhook };
  } catch (error) {
    if (error instanceof Error && error.message === 'Webhook not found') {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: ERROR_MESSAGES.WEBHOOK_NOT_FOUND } };
    }
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}
