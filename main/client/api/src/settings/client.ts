// main/client/api/src/settings/client.ts
/**
 * Settings API Client
 *
 * Type-safe client for user profile and account settings operations.
 */

import { createCsrfRequestClient } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AccountLifecycleResponse,
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  DeactivateAccountRequest,
  DeleteAccountRequest,
  ProfileCompletenessResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  SessionsListResponse,
  SudoRequest,
  SudoResponse,
  UpdateProfileRequest,
  UpdateUsernameRequest,
  UpdateUsernameResponse,
  User,
} from '@bslt/shared';

export interface ApiKeyLocal {
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
  apiKey: ApiKeyLocal;
  plaintext: string;
}

export interface ListApiKeysResponse {
  apiKeys: ApiKeyLocal[];
}

export interface RevokeApiKeyResponse {
  apiKey: ApiKeyLocal;
}

export type SettingsClientConfig = BaseClientConfig;

export interface SettingsClient {
  updateProfile: (data: UpdateProfileRequest) => Promise<User>;
  updateUsername: (data: UpdateUsernameRequest) => Promise<UpdateUsernameResponse>;
  getProfileCompleteness: () => Promise<ProfileCompletenessResponse>;
  changePassword: (data: ChangePasswordRequest) => Promise<ChangePasswordResponse>;
  uploadAvatar: (file: File) => Promise<AvatarUploadResponse>;
  deleteAvatar: () => Promise<AvatarDeleteResponse>;
  listSessions: () => Promise<SessionsListResponse>;
  revokeSession: (sessionId: string) => Promise<RevokeSessionResponse>;
  revokeAllSessions: () => Promise<RevokeAllSessionsResponse>;
  sudo: (data: SudoRequest) => Promise<SudoResponse>;
  deactivateAccount: (
    data: DeactivateAccountRequest,
    sudoToken?: string,
  ) => Promise<AccountLifecycleResponse>;
  requestDeletion: (
    data: DeleteAccountRequest,
    sudoToken?: string,
  ) => Promise<AccountLifecycleResponse>;
  reactivateAccount: () => Promise<AccountLifecycleResponse>;
  listApiKeys: () => Promise<ListApiKeysResponse>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
  revokeApiKey: (keyId: string) => Promise<RevokeApiKeyResponse>;
  deleteApiKey: (keyId: string) => Promise<{ message: string }>;
}

export function createSettingsClient(config: SettingsClientConfig): SettingsClient {
  const { request } = createCsrfRequestClient(config);

  return {
    async updateProfile(data: UpdateProfileRequest): Promise<User> {
      return request<User>('/users/me/update', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
      return request<ChangePasswordResponse>('/users/me/password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
      const formData = new FormData();
      formData.append('avatar', file);

      return request<AvatarUploadResponse>('/users/me/avatar', {
        method: 'PUT',
        body: formData,
      });
    },

    async deleteAvatar(): Promise<AvatarDeleteResponse> {
      return request<AvatarDeleteResponse>('/users/me/avatar/delete', {
        method: 'POST',
      });
    },

    async listSessions(): Promise<SessionsListResponse> {
      return request<SessionsListResponse>('/users/me/sessions', {
        method: 'GET',
      });
    },

    async revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
      return request<RevokeSessionResponse>(`/users/me/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    },

    async revokeAllSessions(): Promise<RevokeAllSessionsResponse> {
      return request<RevokeAllSessionsResponse>('/users/me/sessions/revoke-all', {
        method: 'POST',
      });
    },

    async updateUsername(data: UpdateUsernameRequest): Promise<UpdateUsernameResponse> {
      return request<UpdateUsernameResponse>('/users/me/username', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async getProfileCompleteness(): Promise<ProfileCompletenessResponse> {
      return request<ProfileCompletenessResponse>('/users/me/profile-completeness', {
        method: 'GET',
      });
    },

    async sudo(data: SudoRequest): Promise<SudoResponse> {
      return request<SudoResponse>('/auth/sudo', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deactivateAccount(
      data: DeactivateAccountRequest,
      sudoToken?: string,
    ): Promise<AccountLifecycleResponse> {
      const headers: Record<string, string> = {};
      if (sudoToken !== undefined) {
        headers['x-sudo-token'] = sudoToken;
      }
      return request<AccountLifecycleResponse>('/users/me/deactivate', {
        method: 'POST',
        body: JSON.stringify(data),
        headers,
      });
    },

    async requestDeletion(
      data: DeleteAccountRequest,
      sudoToken?: string,
    ): Promise<AccountLifecycleResponse> {
      const headers: Record<string, string> = {};
      if (sudoToken !== undefined) {
        headers['x-sudo-token'] = sudoToken;
      }
      return request<AccountLifecycleResponse>('/users/me/delete', {
        method: 'POST',
        body: JSON.stringify(data),
        headers,
      });
    },

    async reactivateAccount(): Promise<AccountLifecycleResponse> {
      return request<AccountLifecycleResponse>('/users/me/reactivate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async listApiKeys(): Promise<ListApiKeysResponse> {
      return request<ListApiKeysResponse>('/users/me/api-keys');
    },

    async createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
      return request<CreateApiKeyResponse>('/users/me/api-keys/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async revokeApiKey(keyId: string): Promise<RevokeApiKeyResponse> {
      return request<RevokeApiKeyResponse>(`/users/me/api-keys/${keyId}/revoke`, {
        method: 'POST',
      });
    },

    async deleteApiKey(keyId: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/users/me/api-keys/${keyId}`, {
        method: 'DELETE',
      });
    },
  };
}

export type {
  AccountLifecycleResponse,
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  DeactivateAccountRequest,
  DeleteAccountRequest,
  ProfileCompletenessResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Session,
  SessionsListResponse,
  SudoRequest,
  SudoResponse,
  UpdateProfileRequest,
  UpdateUsernameRequest,
  UpdateUsernameResponse,
  User
} from '@bslt/shared';

