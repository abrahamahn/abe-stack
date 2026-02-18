// main/shared/src/contracts/contract.api.keys.ts
/**
 * API Keys Contracts
 *
 * API contract definitions for user API key management.
 */

import {
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  deleteApiKeyResponseSchema,
  listApiKeysResponseSchema,
  revokeApiKeyResponseSchema,
} from '../system/api-keys';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../system/http';

import type { Contract } from '../primitives/api';

export const apiKeysContract = {
  list: {
    method: 'GET' as const,
    path: '/api/users/me/api-keys',
    responses: {
      200: successResponseSchema(listApiKeysResponseSchema),
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'List API keys',
  },
  create: {
    method: 'POST' as const,
    path: '/api/users/me/api-keys/create',
    body: createApiKeyRequestSchema,
    responses: {
      201: successResponseSchema(createApiKeyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Create API key',
  },
  revoke: {
    method: 'POST' as const,
    path: '/api/users/me/api-keys/:id/revoke',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(revokeApiKeyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Revoke API key',
  },
  remove: {
    method: 'DELETE' as const,
    path: '/api/users/me/api-keys/:id',
    responses: {
      200: successResponseSchema(deleteApiKeyResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Delete API key',
  },
} satisfies Contract;
