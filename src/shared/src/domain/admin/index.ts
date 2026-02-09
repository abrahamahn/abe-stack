// src/shared/src/domain/admin/index.ts
/**
 * Admin Domain
 *
 * Provides schemas and contracts for system monitoring, user management, and maintenance.
 * @module Domain/Admin
 */

export { adminContract } from './admin.contracts';

export {
  USER_STATUSES,
  adminActionResponseSchema,
  adminLockUserRequestSchema,
  adminLockUserResponseSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  userStatusSchema,
} from './admin.schemas';

export type {
  AdminActionResponse,
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
} from './admin.schemas';

export {
  securityContract,
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
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
} from './admin.security-schemas';
