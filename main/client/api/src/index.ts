// main/client/api/src/index.ts
// Lightweight API client wrappers for bslt

// API Client
export type {
  AuthResponse,
  BffLoginResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest, LoginSuccessResponse, MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse, OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse, PasskeyListItem, RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SmsLoginChallengeResponse,
  TotpLoginChallengeResponse,
  TotpLoginVerifyRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse, User, VerifyPhoneResponse
} from '@bslt/shared';
export { createApiClient } from './api/client';
export type { ApiClient, ApiClientConfig, TosRequiredPayload } from './api/client';
export { clearApiClient, getApiClient } from './api/instance';
export type { ApiClientOptions } from './api/types';

// Billing
export { createAdminBillingClient } from './billing/admin';
export type { AdminBillingClient, AdminBillingClientConfig } from './billing/admin';
export { createBillingClient } from './billing/client';
export type { BillingClient, BillingClientConfig } from './billing/client';

// Admin
export { createAdminClient } from './admin/client';
export type { AdminClient, AdminClientConfig } from './admin/client';

// Activities
export { createActivitiesClient } from './activities/client';
export type {
  ActivitiesClient,
  ActivitiesClientConfig,
  ActivityListResponse,
  ActivityLocal
} from './activities/client';

// Errors
export {
  ApiError, createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError, NetworkError,
  TimeoutError
} from './errors';
export type { ApiErrorBody } from './errors';

// Utils
export { API_PREFIX, createCsrfRequestClient, trimTrailingSlashes } from './utils';
export type { BaseClientConfig } from './utils';

// Notifications
export {
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array
} from './notifications/client';
export type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationClient,
  NotificationClientConfig,
  NotificationsListResponse
} from './notifications/client';

// Devices
export { createDeviceClient } from './devices/client';
export type { DeviceClient, DeviceClientConfig, DeviceItem } from './devices/client';

// API Keys
export { createApiKeysClient } from './api-keys/client';
export type {
  ApiKeyItem,
  ApiKeysClient,
  ApiKeysClientConfig,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse
} from './api-keys/client';

// Phone/SMS
export { createPhoneClient } from './phone/client';
export type { PhoneClient, PhoneClientConfig } from './phone/client';

// Webhooks
export { createWebhookClient } from './webhooks/client';
export type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookClient,
  WebhookClientConfig,
  WebhookDeliveryItem,
  WebhookItem,
  WebhookWithDeliveries
} from './webhooks/client';

// Workspace
export { createWorkspaceClient } from './workspace/client';
export type { WorkspaceClient, WorkspaceClientConfig } from './workspace/client';

// Media
export { createMediaClient } from './media/client';
export type {
  MediaMetadata as ApiMediaMetadata, MediaClient,
  MediaClientConfig, MediaStatusResponse,
  MediaUploadResponse
} from './media/client';

// Settings
export { createSettingsClient } from './settings/client';
export type {
  ApiKeyLocal, SettingsClient,
  SettingsClientConfig, CreateApiKeyRequest as SettingsCreateApiKeyRequest,
  CreateApiKeyResponse as SettingsCreateApiKeyResponse,
  ListApiKeysResponse as SettingsListApiKeysResponse,
  RevokeApiKeyResponse as SettingsRevokeApiKeyResponse
} from './settings/client';

