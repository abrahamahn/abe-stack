// apps/server/src/modules/admin/index.ts
/**
 * Admin Module
 *
 * Administrative operations and account management.
 */

// Routes (for auto-registration)
export { adminRoutes } from './routes';

// Handlers
export { handleAdminUnlock } from './handlers';

// Service (business logic)
export { unlockUserAccount, UserNotFoundError } from './service';
