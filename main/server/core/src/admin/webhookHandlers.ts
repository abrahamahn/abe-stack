// main/server/core/src/admin/webhookHandlers.ts
/**
 * Admin Webhook Handlers
 *
 * Handlers for system-wide webhook monitoring and replay.
 */

import { WEBHOOKS_TABLE } from '../../../db/src';
import { ERROR_MESSAGES } from '../auth';

import type { AdminAppContext } from './types';
import type { Repositories } from '../../../db/src';
import type { HttpReply, HttpRequest } from '@bslt/server-system';

type AdminWebhook = {
  id: string;
  tenantId: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminWebhookDelivery = {
  id: string;
  webhookId: string;
  eventType: string;
  status: string;
  attempts: number;
  responseStatus: number | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

function hasUser(
  request: HttpRequest,
): request is HttpRequest & { user: { userId: string } } {
  return Boolean((request as { user?: unknown }).user);
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(String(value)).toISOString();
}

function toOptionalIsoString(value: unknown): string | null {
  return value === null || value === undefined ? null : toIsoString(value);
}

function toWebhook(row: Record<string, unknown>): AdminWebhook {
  return {
    id: String(row['id']),
    tenantId: (row['tenant_id'] as string | null) ?? null,
    url: String(row['url']),
    events: Array.isArray(row['events']) ? (row['events'] as string[]) : [],
    isActive: Boolean(row['is_active']),
    createdAt: toIsoString(row['created_at']),
    updatedAt: toIsoString(row['updated_at']),
  };
}

function getWebhookRepos(
  ctx: AdminAppContext,
): Pick<Repositories, 'webhooks' | 'webhookDeliveries'> {
  return ctx.repos as unknown as Pick<Repositories, 'webhooks' | 'webhookDeliveries'>;
}

export async function handleListAdminWebhooks(
  ctx: AdminAppContext,
  _body: unknown,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: { webhooks: AdminWebhook[] } | { message: string } }> {
  if (!hasUser(request)) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  const query = request.query as { tenantId?: string; limit?: string | number } | undefined;
  const limitNumber = Number(query?.limit ?? 100);
  const limit = Number.isFinite(limitNumber) ? Math.max(1, Math.min(200, limitNumber)) : 100;

  const tenantId = query?.tenantId;
  const hasTenantFilter = typeof tenantId === 'string' && tenantId.length > 0;

  const rows = hasTenantFilter
    ? await ctx.db.raw(
        `
          SELECT id, tenant_id, url, events, is_active, created_at, updated_at
          FROM ${WEBHOOKS_TABLE}
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [tenantId, limit],
      )
    : await ctx.db.raw(
        `
          SELECT id, tenant_id, url, events, is_active, created_at, updated_at
          FROM ${WEBHOOKS_TABLE}
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit],
      );

  const webhooks = rows.map((row) => toWebhook(row));

  ctx.log.info(
    { adminId: request.user.userId, count: webhooks.length, tenantId: tenantId ?? null },
    'Admin listed registered webhooks',
  );

  return { status: 200, body: { webhooks } };
}

export async function handleListAdminWebhookDeliveries(
  ctx: AdminAppContext,
  _body: unknown,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: { deliveries: AdminWebhookDelivery[] } | { message: string } }> {
  if (!hasUser(request)) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  const { webhooks, webhookDeliveries } = getWebhookRepos(ctx);
  const params = request.params as { id: string };
  const query = request.query as { limit?: string | number; status?: string } | undefined;

  const webhook = await webhooks.findById(params.id);
  if (webhook === null) {
    return { status: 404, body: { message: 'Webhook not found' } };
  }

  const limitNumber = Number(query?.limit ?? 100);
  const limit = Number.isFinite(limitNumber) ? Math.max(1, Math.min(200, limitNumber)) : 100;
  const statusFilter = query?.status;

  const deliveries = await webhookDeliveries.findByWebhookId(params.id, limit);
  const filtered =
    typeof statusFilter === 'string'
      ? deliveries.filter((d) => d.status === statusFilter)
      : deliveries;

  return {
    status: 200,
    body: {
      deliveries: filtered.map((delivery) => ({
        id: delivery.id,
        webhookId: delivery.webhookId,
        eventType: delivery.eventType,
        status: delivery.status,
        attempts: delivery.attempts,
        responseStatus: delivery.responseStatus,
        nextRetryAt: toOptionalIsoString(delivery.nextRetryAt),
        deliveredAt: toOptionalIsoString(delivery.deliveredAt),
        createdAt: toIsoString(delivery.createdAt),
      })),
    },
  };
}

export async function handleReplayAdminWebhookDelivery(
  ctx: AdminAppContext,
  _body: unknown,
  request: HttpRequest,
  _reply: HttpReply,
): Promise<{ status: number; body: { success: boolean; deliveryId?: string; message?: string } }> {
  if (!hasUser(request)) {
    return { status: 401, body: { success: false, message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  const { webhooks, webhookDeliveries } = getWebhookRepos(ctx);
  const params = request.params as { id: string; deliveryId: string };

  const webhook = await webhooks.findById(params.id);
  if (webhook === null) {
    return { status: 404, body: { success: false, message: 'Webhook not found' } };
  }

  const existingDelivery = await webhookDeliveries.findById(params.deliveryId);
  if (existingDelivery?.webhookId !== params.id) {
    return { status: 404, body: { success: false, message: 'Delivery not found' } };
  }

  if (existingDelivery.status !== 'failed' && existingDelivery.status !== 'dead') {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Only failed or dead deliveries can be replayed',
      },
    };
  }

  const replayDelivery = await webhookDeliveries.create({
    webhookId: params.id,
    eventType: existingDelivery.eventType,
    payload: existingDelivery.payload,
    status: 'pending',
    attempts: 0,
  });

  ctx.log.info(
    {
      adminId: request.user.userId,
      webhookId: params.id,
      sourceDeliveryId: existingDelivery.id,
      replayDeliveryId: replayDelivery.id,
    },
    'Admin replayed webhook delivery',
  );

  return { status: 200, body: { success: true, deliveryId: replayDelivery.id } };
}
