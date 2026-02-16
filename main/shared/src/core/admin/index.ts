// main/shared/src/domain/admin/index.ts
/**
 * Admin Domain
 *
 * Provides schemas and contracts for system monitoring, user management, and maintenance.
 * @module Domain/Admin
 */

export {
  formatSecurityEventType,
  getAppRoleLabel,
  getAppRoleTone,
  getSecuritySeverityTone,
  getUserStatusLabel,
  getUserStatusTone,
} from './admin.display';

export { adminContract } from '../../contracts';

export {
  USER_STATUSES,
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
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  userStatusSchema,
} from './admin.schemas';

export type {
  AdminActionResponse,
  AdminHardBanRequest,
  AdminHardBanResponse,
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminSuspendTenantRequest,
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
