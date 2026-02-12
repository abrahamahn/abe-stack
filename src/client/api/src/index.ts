// src/client/api/src/index.ts
// Lightweight API client wrappers for abe-stack

// API Client
export { createApiClient } from './api/client';
export type { ApiClient, ApiClientConfig, TosRequiredPayload } from './api/client';
export { clearApiClient, getApiClient } from './api/instance';
export type { ApiClientOptions } from './api/types';
export type {
  AuthResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  RegisterRequest,
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
  TotpVerifyResponse,
  User,
  PasskeyListItem,
} from '@abe-stack/shared';

// Billing
export { createBillingClient } from './billing/client';
export type { BillingClient, BillingClientConfig } from './billing/client';
export { createAdminBillingClient } from './billing/admin';
export type { AdminBillingClient, AdminBillingClientConfig } from './billing/admin';

// Errors
export {
  ApiError,
  NetworkError,
  TimeoutError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
} from './errors';
export type { ApiErrorBody } from './errors';

// Utils
export { API_PREFIX, trimTrailingSlashes } from './utils';
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
  urlBase64ToUint8Array,
} from './notifications/client';
export type { NotificationClient, NotificationClientConfig } from './notifications/client';

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
  RevokeApiKeyResponse,
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
  WebhookWithDeliveries,
} from './webhooks/client';
