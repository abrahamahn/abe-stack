// packages/shared/src/contracts/index.ts
/**
 * API Contracts
 *
 * API contract definitions and validation schemas.
 * Uses manual TypeScript validation instead of zod.
 */

// Schema factory helpers (runtime code)
export {
  coerceDate,
  coerceNumber,
  createArraySchema,
  createBrandedStringSchema,
  createBrandedUuidSchema,
  createEnumSchema,
  createLiteralSchema,
  createSchema,
  createUnionSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseObject,
  parseOptional,
  parseRecord,
  parseString,
  parseTypedRecord,
  withDefault,
} from './schema';

// Contract type definitions
export type {
  Contract,
  ContractRouter,
  EndpointDef,
  HttpMethod,
  InferSchema,
  QueryParams,
  RequestBody,
  SafeParseResult,
  Schema,
  SuccessResponse,
} from './types';

// Combined API contract
export { apiContract } from './api';
export type { ApiContract } from './api';

// Admin contract
export {
  adminContract,
  adminLockUserRequestSchema,
  adminLockUserResponseSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  USER_STATUSES,
  userStatusSchema,
} from './admin';
export type {
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  UnlockAccountRequest,
  UnlockAccountResponse,
  UserStatus,
} from './admin';

// Jobs contract (admin job monitoring)
export {
  JOB_STATUSES,
  jobActionResponseSchema,
  jobDetailsSchema,
  jobErrorSchema,
  jobIdRequestSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  jobsContract,
  jobStatusSchema,
  queueStatsSchema,
} from './jobs';
export type {
  JobActionResponse,
  JobDetails,
  JobError,
  JobIdRequest,
  JobListQuery,
  JobListResponse,
  JobStatus,
  QueueStats,
} from './jobs';

// Auth contract
export {
  authContract,
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  emptyBodySchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyResponseSchema,
  magicLinkVerifySchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
} from './auth';
export type {
  AuthResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  EmptyBody,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutResponse,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
} from './auth';

// Notifications domain types are in domain/notifications/, not contracts

// Common schemas
export {
  createErrorCodeSchema,
  emailSchema,
  emptyBodySchema as commonEmptyBodySchema,
  errorResponseSchema,
  isoDateTimeSchema,
  nameSchema,
  passwordSchema,
  requiredNameSchema,
  uuidSchema,
} from './common';
export type { EmptyBody as CommonEmptyBody, ErrorResponse } from './common';

// Native bridge interface
export type { NativeBridge } from './native';

// Server Environment
export type { ServerEnvironment } from './environment';

// Service interfaces (Ports)
export type {
  EmailOptions,
  EmailResult,
  EmailService,
  Logger,
  NotificationService,
  StorageService,
} from './types';

// Context contracts (shared handler context types)
export type {
  AuthenticatedUser,
  BaseContext,
  ReplyContext,
  RequestContext,
  RequestInfo,
} from './context';

// Capability interfaces (Context Composition pattern)
export type {
  HasBilling,
  HasCache,
  HasEmail,
  HasNotifications,
  HasPubSub,
  HasStorage,
} from './context';

// Pagination schemas
export {
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  SORT_ORDER,
  universalPaginatedResultSchema,
  universalPaginationOptionsSchema,
} from './pagination';
export type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  PaginatedResult,
  PaginationOptions,
  SortOrder,
  UniversalPaginatedResult,
  UniversalPaginationOptions,
} from './pagination';

// Users contract
export {
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  USER_ROLES,
  userRoleSchema,
  userSchema,
  usersContract,
} from './users';
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
  UserRole,
} from './users';

// OAuth contract
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
} from './oauth';
export type {
  OAuthCallbackQuery,
  OAuthCallbackResponse,
  OAuthConnection,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthInitiateResponse,
  OAuthLinkCallbackResponse,
  OAuthLinkResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
} from './oauth';

// Realtime contract
export {
  conflictResponseSchema,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  realtimeContract,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  transactionSchema,
  writeResponseSchema,
} from './realtime';
export type {
  ConflictResponse,
  GetRecordsRequest,
  GetRecordsResponse,
  ListInsertOperation,
  ListPosition,
  ListRemoveOperation,
  Operation,
  RealtimeRecord,
  RealtimeTransaction,
  RecordMap,
  RecordPointer,
  SetNowOperation,
  SetOperation,
  Transaction,
  WriteResponse,
} from './realtime';

// Security contract
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
} from './security';
export type {
  SecurityEvent,
  SecurityEventDetailRequest,
  SecurityEventDetailResponse,
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsFilter,
  SecurityEventsListRequest,
  SecurityEventsListResponse,
  SecurityEventType,
  SecurityMetrics,
  SecurityMetricsRequest,
  SecurityMetricsResponse,
  SecuritySeverity,
} from './security';

// Billing contract
export {
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  addPaymentMethodRequestSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  emptyBillingBodySchema,
  invoiceSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
  adminBillingContract,
  billingContract,
} from './billing/index';
export type {
  AddPaymentMethodRequest,
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  BillingProvider,
  BillingService,
  CancelSubscriptionRequest,
  CardDetails,
  CheckoutParams,
  CheckoutRequest,
  CheckoutResponse,
  CheckoutResult,
  CreatePlanRequest,
  CreateProductParams,
  CreateProductResult,
  EmptyBillingBody,
  Invoice,
  InvoiceStatus,
  InvoicesListResponse,
  NormalizedEventType,
  NormalizedWebhookEvent,
  PaymentMethod,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PaymentMethodType,
  Plan,
  PlanFeature,
  PlanInterval,
  PlansListResponse,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
  SetupIntentResponse,
  SetupIntentResult,
  Subscription,
  SubscriptionActionResponse,
  SubscriptionResponse,
  SubscriptionStatus,
  SyncStripeResponse,
  UpdatePlanRequest,
  UpdateSubscriptionRequest,
} from './billing/index';

// Workspace scoping
export { assertWorkspaceScope, createWorkspaceContext, isWorkspaceScoped } from './workspace';
export type { MaybeWorkspaceContext, WorkspaceContext } from './workspace';

// Entitlements
export {
  assertEntitled,
  assertWithinLimit,
  hasActiveSubscription,
  isEntitled,
  resolveEntitlements,
} from './entitlements';
export type {
  EntitlementInput,
  FeatureEntitlement,
  ResolvedEntitlements,
  SubscriptionState,
} from './entitlements';

// Audit log
export { AUDIT_ACTIONS, AUDIT_CATEGORIES, auditEntrySchema } from './audit';
export type {
  AuditAction,
  AuditCategory,
  AuditEntry,
  AuditQuery,
  AuditResponse,
  AuditService,
  RecordAuditRequest,
} from './audit';

// Data deletion
export {
  calculateHardDeleteDate,
  DEFAULT_DELETION_CONFIG,
  DELETION_STATES,
  deletionRequestSchema,
  isSoftDeleted,
  isWithinGracePeriod,
} from './deletion';
export type {
  DeletionConfig,
  DeletionJob,
  DeletionRequest,
  DeletionService,
  DeletionState,
  SoftDeletable,
} from './deletion';
