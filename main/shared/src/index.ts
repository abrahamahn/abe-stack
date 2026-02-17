// main/shared/src/index.ts

// ============================================================================
// CORE EXPORTS (Errors, constants, guards, result, policy, etc.)
// ============================================================================

export type {
  ApiResponse,
  ApiResult,
  Contract,
  EndpointContract,
  ErrorResponse,
  InferResponseData,
  StatusCode,
} from './primitives/api';

export {
  AppError,
  BadRequestError,
  BaseError,
  ConfigurationError,
  ConflictError,
  ForbiddenError,
  formatValidationErrors,
  getErrorStatusCode,
  getSafeErrorMessage,
  InternalError,
  InternalServerError,
  isAppError,
  NotFoundError,
  ResourceNotFoundError,
  toAppError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
  type AppErrorInfo,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
  type ValidationIssue,
} from './engine/errors';

export {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from './core/auth/auth.errors';
export * from './primitives/constants';
export {
  MAX_CHUNK_SIZE,
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_TIMEOUT_MS,
} from './engine/constants';

export {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse
} from './primitives/helpers/response';

export {
  assert,
  assertDefined,
  assertNever,
  getFieldValue,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isSafeObjectKey,
  isString
} from './primitives/helpers';
export * from './primitives/schema';

export { err, isErr, isOk, ok, type Result } from './primitives/helpers/result';

export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource
} from './core/policy';

export { baseEnvSchema, getRawEnv, validateEnv, type BaseEnv } from './core/env';

export {
  type Attachment,
  type BaseStorageConfig,
  type CacheService,
  type ConfigService,
  type EmailOptions,
  type EmailService,
  type HealthCheckResult,
  type InfrastructureService,
  type Job,
  type JobHandler,
  type JobOptions,
  type JobQueueService,
  type LocalStorageConfig,
  type MetricsService,
  type NotificationService,
  type ReadableStreamLike,
  type S3StorageConfig,
  type SendResult,
  type StorageClient,
  type StorageConfig,
  type StorageProvider
} from './engine/ports';

export { type BreadcrumbData, type ErrorTracker, type HasErrorTracker } from './primitives/observability';

export {
  apiResultSchema,
  emailSchema,
  emptyBodySchema,
  errorCodeSchema,
  errorResponseSchema,
  isoDateTimeSchema,
  passwordSchema,
  successResponseSchema,
  type EmptyBody
} from './core/schemas';

export type { ModuleDeps, ModuleRegistrationOptions } from './engine/module-registration';

export {
  createListInsertOperation,
  createListRemoveOperation,
  createSetOperation,
  createTransaction,
  invertOperation,
  invertTransaction,
  isListInsertOperation,
  isListRemoveOperation,
  isSetOperation,
  mergeTransactions,
  type ListInsertOperation,
  type ListRemoveOperation,
  type Operation,
  type SetOperation,
  type Transaction
} from './core/transactions';

// ============================================================================
// API ROUTER EXPORTS
// ============================================================================

export { apiRouter, type ApiRouter } from './api';

// Contracts
export {
  apiKeysContract,
  usersContract,
  webhooksContract,
} from './contracts';

// ============================================================================
// DOMAIN EXPORTS
// ============================================================================

// Audit log
export {
  auditEventSchema,
  auditLogFilterSchema,
  auditLogListResponseSchema,
  buildAuditEvent,
  createAuditEventSchema,
  getAuditActionTone,
  getAuditSeverityTone,
  sanitizeMetadata,
  type AuditBuilderParams,
  type AuditCategory,
  type AuditEvent,
  type AuditLogFilter,
  type AuditLogListResponse,
  type AuditSeverity,
  type CreateAuditEvent
} from './engine/audit-log';

// Auth
export {
  acceptTosRequestSchema,
  acceptTosResponseSchema,
  AccountLockedError,
  AUTH_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
  authContract,
  authResponseSchema,
  bffLoginResponseSchema,
  calculateEntropy,
  calculateScore,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  COMMON_PASSWORDS,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  containsUserInput,
  defaultPasswordConfig,
  deviceItemSchema,
  deviceListResponseSchema,
  EmailSendError,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  estimateCrackTime,
  estimatePasswordStrength,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  generateFeedback,
  getCharsetSize,
  getStrengthColor,
  getStrengthLabel,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  HTTP_ERROR_MESSAGES,
  invalidateSessionsResponseSchema,
  isCommonPassword,
  isKnownAuthError,
  KEYBOARD_PATTERNS,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  mapErrorToHttpResponse,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  removePhoneResponseSchema,
  renamePasskeyRequestSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  revertEmailChangeRequestSchema,
  revertEmailChangeResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  sudoRequestSchema,
  sudoResponseSchema,
  tosStatusResponseSchema,
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  trustDeviceResponseSchema,
  validatePassword,
  validatePasswordBasic,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnOptionsResponseSchema,
  webauthnRegisterVerifyRequestSchema,
  webauthnRegisterVerifyResponseSchema,
  type AcceptTosRequest,
  type AcceptTosResponse,
  type AuthResponse,
  type BffLoginResponse,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type ConfirmEmailChangeRequest,
  type ConfirmEmailChangeResponse,
  type DeviceItem,
  type DeviceListResponse,
  type EmailVerificationRequest,
  type EmailVerificationResponse,
  type ErrorMapperLogger,
  type ErrorMapperOptions,
  type ErrorStatusCode,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type HttpErrorResponse,
  type InvalidateSessionsResponse,
  type LoginRequest,
  type LoginSuccessResponse,
  type LogoutResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
  type MagicLinkVerifyResponse,
  type PasskeyListItem,
  type PasswordConfig,
  type PasswordPenalties,
  type PasswordValidationResult,
  type RefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type RemovePhoneResponse,
  type RenamePasskeyRequest,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type RevertEmailChangeRequest,
  type RevertEmailChangeResponse,
  type SetPasswordRequest,
  type SetPasswordResponse,
  type SetPhoneRequest,
  type SetPhoneResponse,
  type SmsChallengeRequest,
  type SmsChallengeResponse,
  type SmsLoginChallengeResponse,
  type SmsVerifyRequest,
  type StrengthResult,
  type SudoRequest,
  type SudoResponse,
  type TosStatusResponse,
  type TotpLoginChallengeResponse,
  type TotpLoginVerifyRequest,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
  type TrustDeviceResponse,
  type VerifyPhoneRequest,
  type VerifyPhoneResponse,
  type WebauthnLoginOptionsRequest,
  type WebauthnLoginVerifyRequest,
  type WebauthnOptionsResponse,
  type WebauthnRegisterVerifyRequest,
  type WebauthnRegisterVerifyResponse
} from './core/auth';

// Billing
export {
  addPaymentMethodRequestSchema,
  adminBillingStatsSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  billingContract,
  BillingProviderError,
  BillingProviderNotConfiguredError,
  BillingSubscriptionExistsError,
  BillingSubscriptionNotFoundError,
  calculateProration,
  cancelSubscriptionRequestSchema,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  cardDetailsSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  CheckoutSessionError,
  createPlanRequestSchema,
  CustomerNotFoundError,
  formatPlanInterval,
  formatPrice,
  formatPriceWithInterval,
  getCardBrandLabel,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  InvoiceNotFoundError,
  invoiceSchema,
  invoicesListResponseSchema,
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
  PaymentMethodNotFoundError,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  PaymentMethodValidationError,
  planFeatureSchema,
  PlanHasActiveSubscriptionsError,
  PlanNotActiveError,
  PlanNotFoundError,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
  type AddPaymentMethodRequest,
  type AdminBillingStats,
  type AdminPlan,
  type AdminPlanResponse,
  type AdminPlansListResponse,
  type BillingEventType,
  type BillingProvider,
  type BillingStats,
  type CancelSubscriptionRequest,
  type CardDetails,
  type CheckoutRequest,
  type CheckoutResponse,
  type CreatePlanRequest,
  type FeatureKey,
  type Invoice,
  type InvoiceResponse,
  type InvoicesListResponse,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentMethodResponse,
  type PaymentMethodsListResponse,
  type PaymentMethodType,
  type Plan,
  type PlanFeature,
  type PlanId,
  type PlanInterval,
  type PlansListResponse,
  type SetupIntentResponse,
  type StatusVariant,
  type Subscription,
  type SubscriptionActionResponse,
  type SubscriptionId,
  type SubscriptionResponse,
  type SubscriptionStatus,
  type SyncStripeResponse,
  type UpdatePlanRequest,
  type UpdateSubscriptionRequest
} from './core/billing';

// Compliance
export {
  // Compliance
  consentLogSchema,
  createConsentLogSchema,
  createDataExportRequestSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  dataExportRequestSchema,
  getEffectiveConsent,
  isConsentGranted,
  legalDocumentSchema,
  needsReacceptance,
  updateConsentPreferencesRequestSchema,
  updateLegalDocumentSchema,
  userAgreementSchema,
  type ConsentLog,
  type ConsentType,
  type CreateConsentLog,
  type CreateDataExportRequest,
  type CreateLegalDocument,
  type CreateUserAgreement,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  type DocumentType,
  type LegalDocument,
  type UpdateConsentPreferencesRequest,
  type UpdateLegalDocument,
  type UserAgreement
} from './core/compliance';

// Email
export {
  type EmailProvider,
  type EmailStatus
} from './engine/email';

// Files
export {
  type FilePurpose,
  type FileUploadRequest
} from './engine/files';

// Feature flags
export {
  createFeatureFlagRequestSchema,
  evaluateFlag,
  featureFlagSchema,
  setTenantFeatureOverrideRequestSchema,
  tenantFeatureOverrideSchema,
  updateFeatureFlagRequestSchema,
  type CreateFeatureFlagRequest,
  type FeatureFlag,
  type SetTenantFeatureOverrideRequest,
  type TenantFeatureOverride,
  type UpdateFeatureFlagRequest
} from './engine/feature-flags';

// Jobs
export {
  calculateBackoff,
  canRetry,
  createJobSchema,
  getJobStatusLabel,
  getJobStatusTone,
  isTerminalStatus,
  jobSchema,
  shouldProcess,
  updateJobSchema,
  type CreateJob,
  type DomainJob,
  type JobPriority,
  type JobStatus,
  type UpdateJob
} from './engine/jobs';

// Membership
export {
  acceptInvitationSchema,
  addMemberSchema,
  canAcceptInvite,
  canAssignRole,
  canChangeRole,
  canLeave,
  canRemoveMember,
  canRevokeInvite,
  createInvitationSchema,
  getInvitationStatusTone,
  getNextOwnerCandidate,
  getRoleLevel,
  getTenantRoleTone,
  hasAtLeastRole,
  invitationSchema,
  isInviteExpired,
  isSoleOwner,
  membershipSchema,
  ROLE_LEVELS,
  updateMembershipRoleSchema,
  type AcceptInvitation,
  type AddMember,
  type CreateInvitation,
  type Invitation,
  type InvitationStatus,
  type Membership,
  type UpdateMembershipRole
} from './core/membership';

// Notifications
export {
  baseMarkAsReadRequestSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  deleteNotificationResponseSchema,
  getNotificationLevelTone,
  InvalidPreferencesError,
  InvalidSubscriptionError,
  markReadResponseSchema,
  NOTIFICATION_LEVELS,
  NOTIFICATION_PAYLOAD_MAX_SIZE,
  NOTIFICATION_TYPES,
  notificationDeleteRequestSchema,
  notificationPreferencesSchema,
  NotificationRateLimitError,
  notificationSchema,
  notificationsContract,
  NotificationsDisabledError,
  NotificationSendError,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  preferencesResponseSchema,
  ProviderError,
  ProviderNotConfiguredError,
  PushProviderNotConfiguredError,
  PushSubscriptionExistsError,
  PushSubscriptionNotFoundError,
  QuietHoursActiveError,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  shouldSendNotification,
  subscribeRequestSchema,
  subscribeResponseSchema,
  SubscriptionExistsError,
  SubscriptionExpiredError,
  SubscriptionNotFoundError,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
  VapidNotConfiguredError,
  type BaseMarkAsReadRequest,
  type BatchSendResult,
  type DeleteNotificationResponse,
  type MarkReadResponse,
  type Notification,
  type NotificationAction,
  type NotificationChannel,
  type NotificationDeleteRequest,
  type NotificationLevel,
  type NotificationMessage,
  type NotificationPayload,
  type NotificationPreferences,
  type NotificationPreferencesConfig,
  type NotificationPriority,
  type NotificationsListRequest,
  type NotificationsListResponse,
  type NotificationType,
  type NotificationTypePreference,
  type PreferencesResponse,
  type PushSendResult,
  type PushSubscription,
  type PushSubscriptionKeys,
  type SendNotificationRequest,
  type SendNotificationResponse,
  type StoredPushSubscription,
  type SubscribeRequest,
  type SubscribeResponse,
  type UnsubscribeRequest,
  type UnsubscribeResponse,
  type UpdatePreferencesRequest,
  type VapidKeyResponse
} from './core/notifications';

// Sessions
export {
  createUserSessionSchema,
  getSessionAge,
  isSessionActive,
  isSessionRevoked,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession
} from './core/auth';

// Tenant
export {
  assertWorkspaceScope,
  createTenantSchema,
  createWorkspaceContext,
  extractEmailDomain,
  getWorkspaceContext,
  hasRequiredWorkspaceRole,
  isEmailDomainAllowed,
  isWorkspaceScoped,
  tenantSchema,
  transferOwnershipSchema,
  updateTenantSchema,
  WORKSPACE_ID_HEADER,
  WORKSPACE_ROLE_HEADER,
  type CreateTenantInput,
  type MaybeWorkspaceContext,
  type Tenant,
  type TransferOwnershipInput,
  type UpdateTenantInput,
  type WorkspaceContext
} from './core/tenant';

// Usage metering
export {
  aggregateSnapshots,
  aggregateValues,
  isOverQuota,
  usageMetricSchema,
  usageSnapshotSchema,
  type AggregationType,
  type UsageMetric,
  type UsageSnapshot
} from './engine/usage-metering';

// Users
export {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  APP_ROLES,
  appRoleSchema,
  avatarDeleteResponseSchema,
  avatarUploadRequestSchema,
  avatarUploadResponseSchema,
  calculateDeletionGracePeriodEnd,
  canDeactivate,
  canReactivate,
  canRequestDeletion,
  canUser,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
  getAccountStatus,
  getAllRoles,
  getNextUsernameChangeDate,
  getRoleDisplayName,
  hasRole,
  isAccountActive,
  isAccountDeactivated,
  isAccountPendingDeletion,
  isAdmin,
  isModerator,
  isOwner,
  isRegularUser,
  isUser,
  isUsernameChangeCooldownActive,
  isWithinDeletionGracePeriod,
  profileCompletenessResponseSchema,
  RESERVED_USERNAMES,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  updateUsernameRequestSchema,
  userIdSchema,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  userSchema,
  type AccountLifecycleFields,
  type AccountLifecycleResponse,
  type AccountStatus,
  type AppRole,
  type AvatarDeleteResponse,
  type AvatarUploadRequest,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type DeactivateAccountRequest,
  type DeleteAccountRequest,
  type ProfileCompletenessResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type UpdateProfileRequest,
  type UpdateUsernameRequest,
  type UpdateUsernameResponse,
  type User,
  type UserId
} from './core/users';

// API Keys
export {
  apiKeyItemSchema,
  apiKeySchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  createApiKeySchema,
  deleteApiKeyResponseSchema,
  listApiKeysResponseSchema,
  revokeApiKeyResponseSchema,
  updateApiKeySchema,
  type ApiKey,
  type ApiKeyItem,
  type CreateApiKey,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
  type DeleteApiKeyResponse,
  type ListApiKeysResponse,
  type RevokeApiKeyResponse,
  type UpdateApiKey
} from './engine/api-keys';

// Webhooks
export {
  calculateRetryDelay,
  createWebhookDeliverySchema,
  createWebhookSchema,
  isDeliveryTerminal,
  matchesEventFilter,
  rotateSecretResponseSchema,
  shouldRetryDelivery,
  updateWebhookDeliverySchema,
  updateWebhookSchema,
  webhookDeleteResponseSchema,
  webhookDeliveryItemSchema,
  webhookDeliverySchema,
  webhookItemSchema,
  webhookListResponseSchema,
  webhookMutationResponseSchema,
  webhookResponseSchema,
  webhookSchema,
  webhookWithDeliveriesSchema,
  type CreateWebhook,
  type CreateWebhookDelivery,
  type RotateSecretResponse,
  type UpdateWebhook,
  type UpdateWebhookDelivery,
  type Webhook,
  type WebhookDeleteResponse,
  type WebhookDelivery,
  type WebhookDeliveryItem,
  type WebhookDeliveryStatus,
  type WebhookEventType,
  type WebhookItem,
  type WebhookListResponse,
  type WebhookMutationResponse,
  type WebhookResponse,
  type WebhookWithDeliveries
} from './engine/webhooks';

// ============================================================================
// ADDITIONAL DOMAIN EXPORTS (formerly in contracts/)
// ============================================================================

// Admin (additional exports)
export {
  adminActionResponseSchema,
  adminHardBanRequestSchema,
  adminHardBanResponseSchema,
  adminLockUserRequestSchema,
  adminLockUserResponseSchema,
  adminSuspendTenantRequestSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  formatSecurityEventType,
  getAppRoleLabel,
  getAppRoleTone,
  getSecuritySeverityTone,
  getUserStatusLabel,
  getUserStatusTone,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  USER_STATUSES,
  userStatusSchema,
  type AdminActionResponse,
  type AdminHardBanRequest,
  type AdminHardBanResponse,
  type AdminLockUserRequest,
  type AdminLockUserResponse,
  type AdminSuspendTenantRequest,
  type AdminUpdateUserRequest,
  type AdminUpdateUserResponse,
  type AdminUser,
  type AdminUserListFilters,
  type AdminUserListResponse,
  type UnlockAccountRequest,
  type UnlockAccountResponse,
  type UserStatus
} from './core/admin';

// Context (from engine)
export {
  type AuthenticatedUser,
  type BaseContext,
  type RequestContext as ContractRequestContext,
  type RequestInfo as ContractRequestInfo,
  type HasBilling,
  type HasCache,
  type HasEmail,
  type HasNotifications,
  type HasPubSub,
  type HasStorage,
  type ReplyContext
} from './engine/context';

// Jobs (additional contract exports)
export {
  jobActionResponseSchema,
  jobDetailsSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  queueStatsSchema,
  type JobActionResponse,
  type JobDetails,
  type JobError,
  type JobListQuery,
  type JobListResponse,
  type QueueStats
} from './engine/jobs';

// Billing Service types (from domain)
export {
  type BillingService,
  type CheckoutParams,
  type CheckoutResult,
  type CreateProductParams,
  type CreateProductResult,
  type NormalizedEventType,
  type NormalizedWebhookEvent,
  type ProviderInvoice,
  type ProviderPaymentMethod,
  type ProviderSubscription,
  type SetupIntentResult
} from './core/billing';

// OAuth (from domain/auth)
export {
  OAUTH_PROVIDERS,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  oauthContract,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthProviderSchema,
  oauthUnlinkResponseSchema,
  type OAuthCallbackQuery,
  type OAuthCallbackResponse,
  type OAuthConnection,
  type OAuthConnectionsResponse,
  type OAuthEnabledProvidersResponse,
  type OAuthInitiateResponse,
  type OAuthLinkCallbackResponse,
  type OAuthLinkResponse,
  type OAuthProvider,
  type OAuthUnlinkResponse
} from './core/auth';

// Native bridge (from engine)
export { type NativeBridge } from './engine/native';

// Users contract (legacy aliases)
export { USER_ROLES, userRoleSchema, type UserRole } from './core/users';

// Realtime (from domain)
export {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  conflictResponseSchema,
  getOperationPointers,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
  isFieldMutable,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  PROTECTED_FIELDS,
  REALTIME_ERRORS,
  realtimeContract,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  setPath,
  transactionSchema,
  writeResponseSchema,
  type ApplyOperationsResult,
  type ConflictResponse,
  type GetRecordsRequest,
  type GetRecordsResponse,
  type ListPosition,
  type ListInsertOperation as RealtimeListInsertOperation,
  type ListRemoveOperation as RealtimeListRemoveOperation,
  type RealtimeOperation,
  type RealtimeRecord,
  type SetOperation as RealtimeSetOperation,
  type RealtimeTransaction,
  type RecordMap,
  type RecordPointer,
  type SetNowOperation,
  type VersionConflict,
  type VersionedRecord,
  type WriteResponse
} from './engine/realtime';

// Media (from engine/media — functions and types only; constants via primitives/constants above)
export {
  detectFileType,
  detectFileTypeFromPath,
  generateFileId,
  getMimeType,
  isAllowedFileType,
  parseAudioMetadataFromBuffer,
  sanitizeFilename,
  validateUploadConfig,
  type AudioMetadata,
  type AudioProcessingOptions,
  type ContentModerationResult,
  type FileTypeResult,
  type ImageProcessingOptions,
  type MediaMetadata,
  type MediaProcessingOptions,
  type ProcessingResult,
  type SecurityScanResult,
  type UploadConfig,
  type VideoProcessingOptions,
} from './engine/media';

// Activities (from domain/activities)
export {
  activitySchema,
  createActivitySchema,
  getActorTypeTone,
  type Activity,
  type ActorType,
  type CreateActivity
} from './core/activities';

// Security (from domain/admin)
export {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  securityContract,
  securityEventDetailRequestSchema,
  securityEventDetailResponseSchema,
  securityEventSchema,
  securityEventsExportRequestSchema,
  securityEventsExportResponseSchema,
  securityEventsFilterSchema,
  securityEventsListRequestSchema,
  securityEventsListResponseSchema,
  securityMetricsRequestSchema,
  securityMetricsResponseSchema,
  securityMetricsSchema,
  type SecurityEvent,
  type SecurityEventDetailRequest,
  type SecurityEventDetailResponse,
  type SecurityEventsExportRequest,
  type SecurityEventsExportResponse,
  type SecurityEventsFilter,
  type SecurityEventsListRequest,
  type SecurityEventsListResponse,
  type SecurityEventType,
  type SecurityMetrics,
  type SecurityMetricsRequest,
  type SecurityMetricsResponse,
  type SecuritySeverity
} from './core/admin';

// Commonly-used role types
export type { Permission, TenantRole } from './core/auth/roles';

// ============================================================================
// BROWSER-SAFE UTILITIES
// ============================================================================

// --- Async ---
export {
  DeferredPromise,
  delay,
} from './primitives/helpers';

// --- Cache ---
export {
  CacheCapacityError,
  CacheConnectionError,
  CacheDeserializationError,
  CacheError,
  CacheInvalidKeyError,
  CacheMemoryLimitError,
  CacheNotInitializedError,
  CacheProviderNotFoundError,
  CacheSerializationError,
  CacheTimeoutError,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  LRUCache,
  memoize,
  toCacheError,
  type BaseCacheConfig,
  type CacheConfig,
  type CacheDeleteOptions,
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheGetOptions,
  type CacheProvider,
  type CacheSetOptions,
  type CacheStats,
  type LRUCacheOptions,
  type MemoizeFunction,
  type MemoizeOptions,
  type MemoryCacheConfig,
  type RedisCacheConfig
} from './engine/cache';

// --- Search ---
export {
  buildURLWithQuery,
  compoundFilterSchema,
  contains,
  createSearchQuery,
  cursorSearchResultSchema,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  eq,
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  extractQueryFromURL,
  facetBucketSchema,
  facetConfigSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  facetResultSchema,
  filterArray,
  filterConditionSchema,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fromSearchQuery,
  fullTextSearchConfigSchema,
  gt,
  highlightedFieldSchema,
  inArray,
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  isCompoundFilter,
  isFilterCondition,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  logicalOperatorSchema,
  lt,
  mergeSearchParamsIntoURL,
  neq,
  paginateArray,
  QueryTooComplexError,
  rangeValueSchema,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchQueryBuilder,
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  SearchTimeoutError,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
  sortArray,
  sortConfigSchema,
  UnsupportedOperatorError,
  urlSearchParamsSchema,
  type CompoundFilter,
  type CursorSearchResult,
  type FacetBucket,
  type FacetConfig,
  type FacetedSearchQuery,
  type FacetedSearchResult,
  type FacetResult,
  type FilterCondition,
  type FilterOperator,
  type FilterPrimitive,
  type FilterValue,
  type FullTextSearchConfig,
  type HighlightedField,
  type LogicalOperator,
  type SearchCapabilities,
  type SearchErrorType,
  type SearchProvider,
  type SearchQuery,
  type SearchQueryInput,
  type SearchQueryOutput,
  type SearchResult,
  type SearchResultItem,
  type SerializationOptions,
  type SerializedFilter,
  type SerializedQuery,
  type SortConfig,
  type UrlSearchParamsInput
} from './engine/search';

// --- Logger ---
export {
  CONSOLE_LOG_LEVELS,
  createConsoleLogger,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
  shouldLog,
  type BaseLogger,
  type ConsoleLoggerConfig,
  type ConsoleLogLevel,
  type LogData,
  type Logger,
  type LoggerConfig,
  type LogLevel,
  type RequestContext
} from './engine/logger';

// --- Monitor ---
export {
  buildDetailedHealthResponse,
  checkCache,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkQueue,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
  determineOverallStatus,
  type DetailedHealthResponse,
  type EmailHealthConfig,
  type HealthCheckCache,
  type HealthCheckDatabase,
  type HealthCheckPubSub,
  type HealthCheckQueue,
  type LiveResponse,
  type OverallStatus,
  type ReadyResponse,
  type RoutesResponse,
  type SchemaHealth,
  type SchemaValidationResult,
  type SchemaValidator,
  type ServiceHealth,
  type ServiceStatus,
  type StartupSummaryOptions,
  type StorageHealthConfig,
  type WebSocketStats
} from './engine/health';

// --- PubSub ---
export * as PubSub from './engine/pubsub';

export {
  parseRecordKey,
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
  type ClientMessage,
  type ListKey,
  type ParsedRecordKey,
  type PostgresPubSub,
  type PostgresPubSubOptions,
  type PubSubMessage,
  type RecordKey,
  type ServerMessage,
  type SubscriptionKey,
  type SubscriptionManagerOptions,
  type WebSocket
} from './engine/pubsub';

// --- Casing ---
export {
  camelizeKeys,
  camelToSnake,
  snakeifyKeys,
  snakeToCamel,
  toCamelCaseArray,
  toSnakeCase,
  type KeyMapping
} from './primitives/helpers';

// --- Comparison ---
export { deepEqual } from './primitives/helpers';

// --- Crypto ---
export {
  constantTimeCompare,
  generateSecureId,
  generateToken,
  generateUUID
} from './primitives/helpers/crypto';

// --- HTTP ---
export {
  extractBearerToken,
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
  type BaseRouteDefinition,
  type HandlerContext,
  type HttpMethod,
  type RequestInfo,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type ValidationSchema
} from './engine/http';

export { extractCsrfToken } from './engine/http/csrf';
export { parseMultipartFile, type ParsedMultipartFile } from './engine/http/multipart';
export {
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
  type ForwardedInfo,
  type ProxyValidationConfig
} from './engine/http/proxy';
export {
  extractIpAddress,
  extractUserAgent,
  getRequesterId
} from './engine/http/request';

export {
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
  type SQLInjectionDetectionOptions
} from './engine/security/input';
export { hasDangerousKeys, sanitizePrototype } from './engine/security/prototype';
export {
  getInjectionErrors,
  sanitizeObject,
  type SanitizationResult,
  type ValidationOptions
} from './engine/security/sanitization';

// --- Routes ---
export { createRouteMap, protectedRoute, publicRoute } from './engine/http/routes';

// --- Pagination ---
export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorForItem,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  decodeCursor,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  encodeCursor,
  getQueryParam,
  getSortableValue,
  isCursorValue,
  paginatedResultSchema,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginationOptionsSchema,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
  sortOrderSchema,
  type CursorData,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
  type PaginationParamNames,
  type PaginationParseConfig
} from './engine/pagination';

// --- Rate Limit ---
export { createRateLimiter, type RateLimitInfo } from './engine/security/rate-limit';

// --- Storage ---
export {
  ALLOWED_IMAGE_TYPES,
  generateUniqueFilename,
  joinStoragePath,
  MAX_IMAGE_SIZE,
  MAX_LOGO_SIZE,
  normalizeStoragePath,
  validateFileType
} from './engine/files';

// --- String ---
export {
  canonicalizeEmail,
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  formatBytes,
  normalizeEmail,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  trimTrailingSlashes,
  truncate
} from './primitives/helpers';

// --- User Agent ---
export { parseUserAgent, type ParsedUserAgent } from './engine/http/user-agent';

// --- Token ---
export {
  addAuthHeader,
  createTokenStore,
  tokenStore,
  type TokenStore
} from './engine/crypto/token';

// --- Theme tokens ---
export {
  DEFAULT_CONTRAST_MODE,
  DEFAULT_DENSITY,
  densityMultipliers,
  getContrastCssVariables,
  getDensityCssVariables,
  getSpacingForDensity,
  highContrastDarkOverrides,
  highContrastLightOverrides,
  type ContrastMode,
  type Density
} from './engine/theme';

