// src/shared/src/contracts/index.ts
/**
 * @file Contracts Index (Backward Compatibility)
 * @description Re-exports domain contracts and schemas for backward compatibility.
 * The contracts have been moved to domain-specific modules but are re-exported here.
 * @module Contracts
 */

// Auth contracts
export {
  authContract,
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
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
  type AuthResponse,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type ConfirmEmailChangeRequest,
  type ConfirmEmailChangeResponse,
  type EmailVerificationRequest,
  type EmailVerificationResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type LoginRequest,
  type LogoutResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
  type MagicLinkVerifyResponse,
  type RefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type SetPasswordRequest,
  type SetPasswordResponse,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
} from '../domain/auth';

// Admin contracts
export {
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  type AdminUser,
  type AdminUserListFilters,
  type AdminUserListResponse,
  type UnlockAccountRequest,
  type UnlockAccountResponse,
} from '../domain/admin';

// Users contracts
export {
  appRoleSchema,
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userIdSchema,
  userRoleSchema,
  userSchema,
  usersContract,
  type AppRole,
  type AvatarDeleteResponse,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type UpdateProfileRequest,
  type User,
  type UserId,
  type UserRole,
} from '../domain/users';

// Billing contracts
export { billingContract, type BillingProvider } from '../domain/billing';

// OAuth contracts
export {
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
  type OAuthUnlinkResponse,
} from '../domain/auth';

// Security contracts
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
  type SecurityEvent,
  type SecurityEventDetailRequest,
  type SecurityEventDetailResponse,
  type SecurityEventType,
  type SecurityEventsExportRequest,
  type SecurityEventsExportResponse,
  type SecurityEventsFilter,
  type SecurityEventsListRequest,
  type SecurityEventsListResponse,
  type SecurityMetrics,
  type SecurityMetricsRequest,
  type SecurityMetricsResponse,
  type SecuritySeverity,
} from '../domain/admin';

// Common types
export { type Contract, type EndpointContract } from '../core/api';

// AdminContract type definition
export interface AdminContract {
  unlockAccount: EndpointContract<UnlockAccountRequest, UnlockAccountResponse>;
  // Add other admin endpoints as needed
}

// Re-export for convenience
import type { EndpointContract } from '../core/api';
import type { UnlockAccountRequest, UnlockAccountResponse } from '../domain/admin';

/** Admin contract definition */
export const adminContract = {
  // This is a placeholder - actual implementation may vary
  unlockAccount: {} as EndpointContract<UnlockAccountRequest, UnlockAccountResponse>,
};
