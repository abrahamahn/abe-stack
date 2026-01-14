// apps/server/src/modules/admin/index.ts
/**
 * Admin Module
 *
 * Administrative operations and account management.
 */

export { handleAdminUnlock } from './handlers';
export { unlockUserAccount, UserNotFoundError } from './service';
