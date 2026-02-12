// src/client/api/src/api-keys/client.ts
/**
 * API Keys Client
 *
 * Framework-agnostic client for API key CRUD operations.
 */

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';

export type ApiKeysClientConfig = BaseClientConfig;

export interface ApiKeyItem {
  id: string;
  tenantId: string | null;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKeyItem;
  plaintext: string;
}

export interface ListApiKeysResponse {
  apiKeys: ApiKeyItem[];
}

export interface RevokeApiKeyResponse {
  apiKey: ApiKeyItem;
}

export interface DeleteApiKeyResponse {
  message: string;
}

export interface ApiKeysClient {
  list(): Promise<ListApiKeysResponse>;
  create(payload: CreateApiKeyRequest): Promise<CreateApiKeyResponse>;
  revoke(keyId: string): Promise<RevokeApiKeyResponse>;
  remove(keyId: string): Promise<DeleteApiKeyResponse>;
}

export function createApiKeysClient(config: ApiKeysClientConfig): ApiKeysClient {
  const factory = createRequestFactory(config);

  return {
    list: () => apiRequest<ListApiKeysResponse>(factory, '/users/me/api-keys'),

    create: (payload) =>
      apiRequest<CreateApiKeyResponse>(factory, '/users/me/api-keys/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    revoke: (keyId) =>
      apiRequest<RevokeApiKeyResponse>(factory, `/users/me/api-keys/${keyId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),

    remove: (keyId) =>
      apiRequest<DeleteApiKeyResponse>(factory, `/users/me/api-keys/${keyId}`, {
        method: 'DELETE',
      }),
  };
}
