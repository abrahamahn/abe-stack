// packages/core/src/contracts/index.ts
/**
 * API Contracts
 *
 * ts-rest API contract definitions and Zod validation schemas.
 */

// Combined API contract
export { apiContract } from './api';
export type { ApiContract } from './api';

// Admin contract
export { adminContract, unlockAccountRequestSchema, unlockAccountResponseSchema } from './admin';
export type { UnlockAccountRequest, UnlockAccountResponse } from './admin';

// Auth contract
export {
  authContract,
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
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
} from './auth';
export type {
  AuthResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
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
export { USER_ROLES, userResponseSchema, userRoleSchema, userSchema, usersContract } from './users';
export type { User, UserResponse, UserRole } from './users';

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
  GetRecordsResponse,
  ListInsertOperation,
  ListPosition,
  ListRemoveOperation,
  Operation,
  RealtimeRecord,
  RecordMap,
  RecordPointer,
  SetNowOperation,
  SetOperation,
  Transaction,
  WriteResponse,
} from './realtime';
