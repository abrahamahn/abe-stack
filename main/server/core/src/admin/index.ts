// main/server/core/src/admin/index.ts
/**
 * Admin Module
 *
 * Administrative operations and account management.
 */

// Routes (for auto-registration)
export { adminRoutes } from './routes';

// Middleware
export { createIpAllowlistMiddleware, type IpAllowlistConfig } from './ip-allowlist';

// Handlers
export { handleAdminUnlock } from './handlers';
export { handleListAuditEvents } from './auditHandlers';
export { handleEndImpersonation, handleStartImpersonation } from './impersonationHandlers';
export { handleGetRouteManifest } from './route-manifest';
export {
  handleAdminCreatePlan,
  handleAdminDeactivatePlan,
  handleAdminGetPlan,
  handleAdminListPlans,
  handleAdminSyncPlanToStripe,
  handleAdminUpdatePlan,
} from './billingHandlers';
export {
  handleCancelJob,
  handleGetJobDetails,
  handleGetQueueStats,
  handleListJobs,
  handleRetryJob,
} from './jobsHandlers';
export { handleGetMetrics } from './metricsHandler';
export { handleGetAdminHealth } from './healthHandler';
export {
  handleListAdminWebhookDeliveries,
  handleListAdminWebhooks,
  handleReplayAdminWebhookDelivery,
} from './webhookHandlers';
export {
  handleExportSecurityEvents,
  handleGetSecurityEvent,
  handleGetSecurityMetrics,
  handleListSecurityEvents,
} from './securityHandlers';
export {
  handleGetTenantDetail,
  handleListAllTenants,
  handleSuspendTenant,
  handleUnsuspendTenant,
} from './tenantHandlers';
export {
  handleGetUser,
  handleHardBan,
  handleListUsers,
  handleLockUser,
  handleSearchUsers,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';

// Service (business logic)
export {
  endImpersonation,
  ImpersonationForbiddenError,
  ImpersonationRateLimitError,
  startImpersonation,
  validateImpersonationToken,
  type ImpersonationAuditLogger,
  type ImpersonationConfig,
  type ImpersonationEndResult,
  type ImpersonationRepositories,
  type ImpersonationStartResult,
  type ImpersonationTokenPayload,
} from './impersonation';
export { unlockUserAccount, UserNotFoundError } from './service';
export {
  createPlan,
  deactivatePlan,
  getAllPlans,
  getPlanById,
  syncPlanToStripe,
  updatePlan,
  type AdminBillingRepositories,
  type CreatePlanParams,
  type UpdatePlanParams,
} from './billingService';
export {
  getTenantDetail,
  listAllTenants,
  suspendTenant,
  TenantNotFoundError,
  unsuspendTenant,
  type AdminTenant,
  type AdminTenantDetail,
  type AdminTenantListResponse,
  type ListTenantsOptions,
  type TenantSuspendResult,
} from './tenantService';
export {
  getUserById,
  getUserStatus,
  hardBanUser,
  listUsers,
  lockUser,
  searchUsers,
  unlockUser,
  updateUser,
  type HardBanResult,
  type SearchUsersOptions,
  type SearchUsersResponse,
} from './userService';
export {
  cancelJob,
  getJobDetails,
  getQueueStats,
  JobNotFoundError,
  listJobs,
  QueueStoreNotAvailableError,
  redactSensitiveFields,
  retryJob,
} from './jobsService';
export {
  exportSecurityEvents,
  getSecurityEvent,
  getSecurityMetrics,
  listSecurityEvents,
  SecurityEventNotFoundError,
} from './securityService';
