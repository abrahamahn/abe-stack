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
  TotpLoginChallengeResponse,
  TotpLoginVerifyRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
  User,
} from '@abe-stack/shared';

// Billing
export { createBillingClient } from './billing/client';
export type { BillingClient, BillingClientConfig } from './billing/client';
export {
  billingQueryKeys,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
} from './billing/hooks';
export type {
  InvoicesState,
  PaymentMethodsState,
  PlansState,
  SubscriptionState,
} from './billing/hooks';
export { createAdminBillingClient, useAdminPlans } from './billing/admin';
export type {
  AdminBillingClient,
  AdminBillingClientConfig,
  AdminPlansState,
} from './billing/admin';

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
export {
  useNotificationPreferences,
  usePushPermission,
  usePushSubscription,
  useTestNotification,
} from './notifications/hooks';
export type {
  NotificationPreferencesState,
  PushPermissionState,
  PushSubscriptionState,
  TestNotificationState,
  UseNotificationPreferencesOptions,
  UsePushSubscriptionOptions,
} from './notifications/hooks';

// OAuth
export {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from './oauth/hooks';
export type { EnabledOAuthProvidersState, OAuthConnectionsState } from './oauth/hooks';
