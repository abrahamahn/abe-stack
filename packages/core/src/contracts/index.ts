// packages/core/src/contracts/index.ts
/**
 * API Contracts
 *
 * API contract definitions and validation schemas.
 * Uses manual TypeScript validation instead of zod.
 */

// Contract type definitions
export { createSchema } from './types';
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
export { USER_ROLES, userRoleSchema, userSchema, usersContract } from './users';
export type { User, UserRole } from './users';

// OAuth contract
export {
  oauthContract,
  oauthProviderSchema,
  oauthInitiateResponseSchema,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthUnlinkResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  OAUTH_PROVIDERS,
} from './oauth';
export type {
  OAuthProvider,
  OAuthInitiateResponse,
  OAuthCallbackQuery,
  OAuthCallbackResponse,
  OAuthLinkResponse,
  OAuthLinkCallbackResponse,
  OAuthUnlinkResponse,
  OAuthConnection,
  OAuthConnectionsResponse,
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
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
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
  // Constants
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  // Contracts
  adminBillingContract,
  billingContract,
  // Schemas
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
} from './billing';
export type {
  // Types
  AddPaymentMethodRequest,
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  BillingProvider,
  CancelSubscriptionRequest,
  CardDetails,
  CheckoutRequest,
  CheckoutResponse,
  CreatePlanRequest,
  EmptyBillingBody,
  Invoice,
  InvoiceStatus,
  InvoicesListResponse,
  PaymentMethod,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PaymentMethodType,
  Plan,
  PlanFeature,
  PlanInterval,
  PlansListResponse,
  SetupIntentResponse,
  Subscription,
  SubscriptionActionResponse,
  SubscriptionResponse,
  SubscriptionStatus,
  SyncStripeResponse,
  UpdatePlanRequest,
  UpdateSubscriptionRequest,
} from './billing';
