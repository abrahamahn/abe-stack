// packages/contracts/src/index.ts
/**
 * API Contracts
 *
 * API contract definitions and validation schemas.
 * Uses manual TypeScript validation instead of zod.
 */

// Schema factory helpers (runtime code)
export { createSchema } from './schema';

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
} from './auth';
export type {
  AuthResponse,
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
} from './auth';

// Common schemas
export {
  emailSchema,
  errorResponseSchema,
  nameSchema,
  passwordSchema,
  requiredNameSchema,
  uuidSchema,
} from './common';
export type { ErrorResponse } from './common';

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
export type {
  // Types
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
  InvoicesListResponse,
  InvoiceStatus,
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
export {
  // Schemas
  addPaymentMethodRequestSchema,
  // Contracts
  adminBillingContract,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  // Constants
  BILLING_PROVIDERS,
  billingContract,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  emptyBillingBodySchema,
  INVOICE_STATUSES,
  invoiceSchema,
  invoicesListResponseSchema,
  PAYMENT_METHOD_TYPES,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  PLAN_INTERVALS,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  SUBSCRIPTION_STATUSES,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
} from './billing/billing';
