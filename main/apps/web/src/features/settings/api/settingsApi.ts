// main/apps/web/src/features/settings/api/settingsApi.ts
/**
 * Settings API Client (web adapter)
 *
 * Thin wrapper around centralized @abe-stack/api settings client to preserve
 * existing web-facing API naming.
 */

import { createSettingsClient } from '@abe-stack/api';

import type {
  BaseClientConfig,
  SettingsClient,
  SettingsCreateApiKeyRequest,
  SettingsCreateApiKeyResponse,
  SettingsListApiKeysResponse,
  SettingsRevokeApiKeyResponse,
} from '@abe-stack/api';

export type ApiKeyLocal = import('@abe-stack/api').ApiKeyLocal;
export type CreateApiKeyRequest = SettingsCreateApiKeyRequest;
export type CreateApiKeyResponse = SettingsCreateApiKeyResponse;
export type ListApiKeysResponse = SettingsListApiKeysResponse;
export type RevokeApiKeyResponse = SettingsRevokeApiKeyResponse;

export type SettingsApiConfig = BaseClientConfig;
export type SettingsApi = SettingsClient;

export function createSettingsApi(config: SettingsApiConfig): SettingsApi {
  return createSettingsClient(config);
}

export type { ApiError } from '@abe-stack/api';
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
  User,
} from '@abe-stack/shared';
