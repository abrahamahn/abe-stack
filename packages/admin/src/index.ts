// packages/admin/src/index.ts
/**
 * Admin Module
 *
 * Administrative operations and account management.
 */

// Routes (for auto-registration)
export { adminRoutes } from './routes';

// Handlers
export { handleAdminUnlock } from './handlers';
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
export {
  handleExportSecurityEvents,
  handleGetSecurityEvent,
  handleGetSecurityMetrics,
  handleListSecurityEvents,
} from './securityHandlers';
export {
  handleGetUser,
  handleListUsers,
  handleLockUser,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';

// Service (business logic)
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
  getUserById,
  getUserStatus,
  listUsers,
  lockUser,
  unlockUser,
  updateUser,
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
