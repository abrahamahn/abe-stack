// apps/server/src/infrastructure/jobs/scheduled/index.ts
/**
 * Scheduled Jobs
 *
 * Maintenance and cleanup tasks that run on a schedule.
 * These can be triggered by cron jobs, queue systems, or manually.
 */

// Login Cleanup
export {
  cleanupOldLoginAttempts,
  countOldLoginAttempts,
  getLoginAttemptStats,
  getTotalLoginAttemptCount,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_BATCH_SIZE,
  type CleanupOptions,
  type CleanupResult,
} from './loginCleanup';
