// main/shared/src/contracts/contract.webhooks.ts
/**
 * Webhooks Contracts
 *
 * API contract definitions for webhook CRUD operations.
 */

import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../system/http';
import {
  createWebhookSchema,
  rotateSecretResponseSchema,
  updateWebhookSchema,
  webhookDeleteResponseSchema,
  webhookListResponseSchema,
  webhookMutationResponseSchema,
  webhookResponseSchema,
} from '../system/webhooks/webhooks';

import type { Contract } from '../primitives/api';

export const webhooksContract = {
  create: {
    method: 'POST' as const,
    path: '/api/webhooks',
    body: createWebhookSchema,
    responses: {
      201: successResponseSchema(webhookMutationResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create webhook',
  },
  list: {
    method: 'GET' as const,
    path: '/api/webhooks/list',
    responses: {
      200: successResponseSchema(webhookListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List webhooks',
  },
  get: {
    method: 'GET' as const,
    path: '/api/webhooks/:id',
    responses: {
      200: successResponseSchema(webhookResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get webhook details',
  },
  update: {
    method: 'POST' as const,
    path: '/api/webhooks/:id/update',
    body: updateWebhookSchema,
    responses: {
      200: successResponseSchema(webhookMutationResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update webhook',
  },
  remove: {
    method: 'POST' as const,
    path: '/api/webhooks/:id/delete',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(webhookDeleteResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete webhook',
  },
  rotateSecret: {
    method: 'POST' as const,
    path: '/api/webhooks/:id/rotate-secret',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(rotateSecretResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Rotate webhook secret',
  },
} satisfies Contract;
