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

// Push Subscription Cleanup
export {
  cleanupPushSubscriptions,
  countCleanupCandidates as countPushCleanupCandidates,
  getPushSubscriptionStats,
  DEFAULT_INACTIVE_DAYS,
  MIN_INACTIVE_DAYS,
  MAX_BATCH_SIZE as PUSH_MAX_BATCH_SIZE,
  type PushCleanupOptions,
  type PushCleanupResult,
} from './pushSubscriptionCleanup';

// Magic Link Token Cleanup
export {
  cleanupMagicLinkTokens,
  countOldMagicLinkTokens,
  getMagicLinkTokenStats,
  getTotalMagicLinkTokenCount,
  DEFAULT_RETENTION_HOURS as MAGIC_LINK_DEFAULT_RETENTION_HOURS,
  MIN_RETENTION_HOURS as MAGIC_LINK_MIN_RETENTION_HOURS,
  MAX_BATCH_SIZE as MAGIC_LINK_MAX_BATCH_SIZE,
  type MagicLinkCleanupOptions,
  type MagicLinkCleanupResult,
} from './magicLinkCleanup';

// OAuth Token Refresh
export {
  refreshExpiringOAuthTokens,
  countExpiringOAuthTokens,
  getOAuthTokenStats,
  DEFAULT_REFRESH_BEFORE_HOURS as OAUTH_DEFAULT_REFRESH_BEFORE_HOURS,
  MIN_REFRESH_BEFORE_HOURS as OAUTH_MIN_REFRESH_BEFORE_HOURS,
  MAX_BATCH_SIZE as OAUTH_MAX_BATCH_SIZE,
  type OAuthTokenRefreshOptions,
  type OAuthTokenRefreshResult,
} from './oauthTokenRefresh';
