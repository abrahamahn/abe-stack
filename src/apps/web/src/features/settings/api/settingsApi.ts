// apps/web/src/features/settings/api/settingsApi.ts
/**
 * Settings API Client
 *
 * API functions for user profile and settings operations.
 */

import { createApiError, NetworkError } from '@abe-stack/client-engine';

import type {
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  SessionsListResponse,
  UpdateProfileRequest,
  User,
} from '@abe-stack/shared';

// ============================================================================
// Settings API Client
// ============================================================================

export interface SettingsApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface SettingsApi {
  // Profile
  updateProfile: (data: UpdateProfileRequest) => Promise<User>;

  // Password
  changePassword: (data: ChangePasswordRequest) => Promise<ChangePasswordResponse>;

  // Avatar
  uploadAvatar: (file: File) => Promise<AvatarUploadResponse>;
  deleteAvatar: () => Promise<AvatarDeleteResponse>;

  // Sessions
  listSessions: () => Promise<SessionsListResponse>;
  revokeSession: (sessionId: string) => Promise<RevokeSessionResponse>;
  revokeAllSessions: () => Promise<RevokeAllSessionsResponse>;
}

const API_PREFIX = '/api';

function addAuthHeader(headers: Headers, token: string | null | undefined): void {
  if (token !== null && token !== undefined && token !== '') {
    headers.set('Authorization', `Bearer ${token}`);
  }
}

export function createSettingsApi(config: SettingsApiConfig): SettingsApi {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);

    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data as { message?: string; code?: string });
    }

    return data as T;
  };

  return {
    // Profile
    async updateProfile(data: UpdateProfileRequest): Promise<User> {
      return request<User>('/users/me/update', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    // Password
    async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
      return request<ChangePasswordResponse>('/users/me/password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Avatar
    async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
      const formData = new FormData();
      formData.append('avatar', file);

      return request<AvatarUploadResponse>('/users/me/avatar', {
        method: 'POST',
        body: formData,
      });
    },

    async deleteAvatar(): Promise<AvatarDeleteResponse> {
      return request<AvatarDeleteResponse>('/users/me/avatar/delete', {
        method: 'DELETE',
      });
    },

    // Sessions
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
  };
}

// ============================================================================
// Type Re-exports for Convenience
// ============================================================================

export type { ApiError } from '@abe-stack/client-engine';
export type {
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Session,
  SessionsListResponse,
  UpdateProfileRequest,
  User,
} from '@abe-stack/shared';
