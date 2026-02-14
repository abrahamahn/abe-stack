// main/server/core/src/feature-flags/index.ts
/**
 * Feature Flags Package
 *
 * Business logic, HTTP handlers, and route definitions for
 * feature flag management and evaluation.
 */

// Service
export {
  listFlags,
  createFlag,
  updateFlag,
  deleteFlag,
  listTenantOverrides,
  setTenantOverride,
  deleteTenantOverride,
  evaluateFlags,
} from './service';

// Handlers
export {
  handleListFlags,
  handleCreateFlag,
  handleUpdateFlag,
  handleDeleteFlag,
  handleListTenantOverrides,
  handleSetTenantOverride,
  handleDeleteTenantOverride,
  handleEvaluateFlags,
} from './handlers';

// Middleware
export { createFeatureFlagGuard } from './middleware';

// Routes
export { featureFlagRoutes } from './routes';

// Types
export type { FeatureFlagAppContext, FeatureFlagRequest } from './types';
