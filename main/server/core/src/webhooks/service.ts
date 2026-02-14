// main/server/core/src/webhooks/service.ts
/**
 * Webhooks Service
 *
 * Business logic for webhook CRUD operations.
 * No HTTP awareness -- returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 *
 * @module service
 */

import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@abe-stack/shared';

import type {
    CreateWebhookData,
    DeliverySummary,
    UpdateWebhookData,
    WebhookWithStats,
} from './types';
import type { Repositories, Webhook } from '../../../db/src';

// ============================================================================
// Secret Generation
// ============================================================================

/**
 * Generate a cryptographically random webhook secret.
 * Produces a 32-byte hex string (64 characters) suitable for HMAC-SHA256 signing.
 *
 * @returns Hex-encoded random secret
 * @complexity O(1)
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new webhook subscription for a tenant.
 *
 * Generates a shared secret automatically and registers the webhook
 * as active by default.
 *
 * @param repos - Repository container
 * @param tenantId - Tenant that owns the webhook
 * @param userId - User creating the webhook (for audit purposes)
 * @param data - Webhook creation data (url, events)
 * @returns Created webhook record
 * @complexity O(1) - single database insert
 */
export async function createWebhook(
  repos: Repositories,
  tenantId: string,
  userId: string,
  data: CreateWebhookData,
): Promise<Webhook> {
  // userId is accepted for audit trail purposes (future use)
  void userId;

  const secret = generateWebhookSecret();

  return repos.webhooks.create({
    tenantId,
    url: data.url,
    events: data.events,
    secret,
    isActive: true,
  });
}

/**
 * List all webhooks for a tenant.
 *
 * @param repos - Repository container
 * @param tenantId - Tenant whose webhooks to list
 * @returns Array of webhooks, ordered by creation date descending
 * @complexity O(n) where n is the number of webhooks
 */
export async function listWebhooks(repos: Repositories, tenantId: string): Promise<Webhook[]> {
  return repos.webhooks.findByTenantId(tenantId);
}

/**
 * Get a webhook by ID with recent delivery stats.
 *
 * Validates that the webhook belongs to the specified tenant.
 *
 * @param repos - Repository container
 * @param webhookId - Webhook ID to look up
 * @param tenantId - Tenant ID for ownership validation
 * @returns Webhook with delivery statistics
 * @throws NotFoundError if webhook not found or belongs to different tenant
 * @complexity O(n) where n is the number of recent deliveries fetched
 */
export async function getWebhook(
  repos: Repositories,
  webhookId: string,
  tenantId: string,
): Promise<WebhookWithStats> {
  const webhook = await repos.webhooks.findById(webhookId);

  if (webhook?.tenantId !== tenantId) {
    throw new NotFoundError('Webhook not found');
  }

  const deliveries = await repos.webhookDeliveries.findByWebhookId(webhookId, 20);

  const recentDeliveries: DeliverySummary[] = deliveries.map((d) => ({
    id: d.id,
    eventType: d.eventType,
    status: d.status,
    attempts: d.attempts,
    createdAt: d.createdAt,
    deliveredAt: d.deliveredAt,
  }));

  return {
    id: webhook.id,
    tenantId: webhook.tenantId,
    url: webhook.url,
    events: webhook.events,
    secret: webhook.secret,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
    recentDeliveries,
  };
}

/**
 * Update a webhook's URL, events, or active status.
 *
 * Validates that the webhook belongs to the specified tenant.
 *
 * @param repos - Repository container
 * @param webhookId - Webhook ID to update
 * @param tenantId - Tenant ID for ownership validation
 * @param data - Fields to update
 * @returns Updated webhook record
 * @throws NotFoundError if webhook not found or belongs to different tenant
 * @complexity O(1)
 */
export async function updateWebhook(
  repos: Repositories,
  webhookId: string,
  tenantId: string,
  data: UpdateWebhookData,
): Promise<Webhook> {
  const existing = await repos.webhooks.findById(webhookId);

  if (existing?.tenantId !== tenantId) {
    throw new NotFoundError('Webhook not found');
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.url !== undefined) updatePayload['url'] = data.url;
  if (data.events !== undefined) updatePayload['events'] = data.events;
  if (data.isActive !== undefined) updatePayload['isActive'] = data.isActive;

  if (Object.keys(updatePayload).length === 0) {
    return existing;
  }

  const updated = await repos.webhooks.update(webhookId, updatePayload);

  if (updated === null) {
    throw new Error('Failed to update webhook');
  }

  return updated;
}

/**
 * Soft-delete a webhook by marking it inactive and removing its event subscriptions.
 *
 * Rather than physically deleting the row (which would lose delivery history),
 * this disables the webhook and clears its event list.
 *
 * @param repos - Repository container
 * @param webhookId - Webhook ID to delete
 * @param tenantId - Tenant ID for ownership validation
 * @throws NotFoundError if webhook not found or belongs to different tenant
 * @complexity O(1)
 */
export async function deleteWebhook(
  repos: Repositories,
  webhookId: string,
  tenantId: string,
): Promise<void> {
  const existing = await repos.webhooks.findById(webhookId);

  if (existing?.tenantId !== tenantId) {
    throw new NotFoundError('Webhook not found');
  }

  await repos.webhooks.update(webhookId, {
    isActive: false,
    events: [],
  });
}

/**
 * Rotate the shared secret for a webhook.
 *
 * Generates a new random secret and updates the webhook record.
 * The old secret is immediately invalidated.
 *
 * @param repos - Repository container
 * @param webhookId - Webhook ID to rotate
 * @param tenantId - Tenant ID for ownership validation
 * @returns Updated webhook with new secret
 * @throws NotFoundError if webhook not found or belongs to different tenant
 * @complexity O(1)
 */
export async function rotateWebhookSecret(
  repos: Repositories,
  webhookId: string,
  tenantId: string,
): Promise<Webhook> {
  const existing = await repos.webhooks.findById(webhookId);

  if (existing?.tenantId !== tenantId) {
    throw new NotFoundError('Webhook not found');
  }

  const newSecret = generateWebhookSecret();

  const updated = await repos.webhooks.update(webhookId, {
    secret: newSecret,
  });

  if (updated === null) {
    throw new Error('Failed to rotate webhook secret');
  }

  return updated;
}
