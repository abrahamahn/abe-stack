// main/client/api/src/api-keys/client.ts
/**
 * API Keys Client
 *
 * Framework-agnostic client for API key CRUD operations.
 */

import {
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  deleteApiKeyResponseSchema,
  listApiKeysResponseSchema,
  revokeApiKeyResponseSchema,
} from '@bslt/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  ApiKeyItem,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from '@bslt/shared';

export type ApiKeysClientConfig = BaseClientConfig;
export type {
  ApiKeyItem,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse
};

export interface ApiKeysClient {
  list(): Promise<ListApiKeysResponse>;
  create(payload: CreateApiKeyRequest): Promise<CreateApiKeyResponse>;
  revoke(keyId: string): Promise<RevokeApiKeyResponse>;
  remove(keyId: string): Promise<DeleteApiKeyResponse>;
}

export function createApiKeysClient(config: ApiKeysClientConfig): ApiKeysClient {
  const factory = createRequestFactory(config);

  return {
    list: () =>
      apiRequest(factory, '/users/me/api-keys', undefined, true, listApiKeysResponseSchema),

    create: (payload): Promise<CreateApiKeyResponse> => {
      const validated = createApiKeyRequestSchema.parse(payload);
      return apiRequest(
        factory,
        '/users/me/api-keys/create',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        createApiKeyResponseSchema,
      );
    },

    revoke: (keyId) =>
      apiRequest(
        factory,
        `/users/me/api-keys/${keyId}/revoke`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        revokeApiKeyResponseSchema,
      ),

    remove: (keyId) =>
      apiRequest(
        factory,
        `/users/me/api-keys/${keyId}`,
        { method: 'DELETE' },
        true,
        deleteApiKeyResponseSchema,
      ),
  };
}
