// main/client/api/src/index.ts
// Lightweight API client wrappers for bslt

// Shared types
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
  LoginRequest,
  LoginSuccessResponse,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  PasskeyListItem,
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
  VerifyPhoneResponse,
} from '@bslt/shared';

// API Client
export { createApiClient, clearApiClient, getApiClient } from './api';
export type { ApiClient, ApiClientConfig, TosRequiredPayload, ApiClientOptions } from './api';

// Billing
export { createAdminBillingClient, createBillingClient } from './billing';
export type {
  AdminBillingClient,
  AdminBillingClientConfig,
  BillingClient,
  BillingClientConfig,
} from './billing';

// Admin
export { createAdminClient } from './admin';
export type { AdminClient, AdminClientConfig } from './admin';

// Activities
export { createActivitiesClient } from './activities';
export type {
  ActivitiesClient,
  ActivitiesClientConfig,
  ActivityListResponse,
  ActivityLocal,
} from './activities';

// Errors
export {
  ApiError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
  NetworkError,
  TimeoutError,
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
  urlBase64ToUint8Array,
} from './notifications';
export type {
  DeleteNotificationResponse,
  MarkReadResponse,
  NotificationClient,
  NotificationClientConfig,
  NotificationsListResponse,
} from './notifications';

// Devices
export { createDeviceClient } from './devices';
export type { DeviceClient, DeviceClientConfig, DeviceItem } from './devices';

// API Keys
export { createApiKeysClient } from './api-keys';
export type {
  ApiKeyItem,
  ApiKeysClient,
  ApiKeysClientConfig,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from './api-keys';

// Phone/SMS
export { createPhoneClient } from './phone';
export type { PhoneClient, PhoneClientConfig } from './phone';

// Webhooks
export { createWebhookClient } from './webhooks';
export type {
  CreateWebhookRequest,
  DeliveryListResponse,
  DeliveryReplayResponse,
  UpdateWebhookRequest,
  WebhookClient,
  WebhookClientConfig,
  WebhookDeliveryItem,
  WebhookItem,
  WebhookWithDeliveries,
} from './webhooks';

// Workspace
export { createWorkspaceClient } from './workspace';
export type { WorkspaceClient, WorkspaceClientConfig } from './workspace';

// Media
export { createMediaClient } from './media';
export type {
  MediaMetadata as ApiMediaMetadata,
  MediaClient,
  MediaClientConfig,
  MediaStatusResponse,
  MediaUploadResponse,
} from './media';

// Settings
export { createSettingsClient } from './settings';
export type {
  ApiKeyLocal,
  SettingsClient,
  SettingsClientConfig,
  CreateApiKeyRequest as SettingsCreateApiKeyRequest,
  CreateApiKeyResponse as SettingsCreateApiKeyResponse,
  ListApiKeysResponse as SettingsListApiKeysResponse,
  RevokeApiKeyResponse as SettingsRevokeApiKeyResponse,
} from './settings';

// Legal
export { createLegalClient } from './legal';
export type {
  CurrentLegalResponse,
  LegalClient,
  LegalClientConfig,
  LegalDocumentItem,
  PublishLegalDocumentRequest,
  PublishLegalDocumentResponse,
  UserAgreementItem,
  UserAgreementsResponse,
} from './legal';

// Generated API Client (from route definitions)
export { createGeneratedApiClient, generatedRouteDefinitions } from './generated';
export type {
  GeneratedApiClientConfig,
  GeneratedApiMethod,
  GeneratedApiPath,
  GeneratedApiRequest,
  GeneratedRouteDefinition,
  GeneratedRouteModule,
  MethodsForPath,
} from './generated';
