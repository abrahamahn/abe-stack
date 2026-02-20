// main/server/core/src/scheduled-tasks/service.ts
/**
 * Scheduled Task Service
 *
 * Manages background cleanup tasks that run on regular intervals.
 * Uses setInterval for scheduling without external dependencies.
 *
 * @module
 */

import { DAYS_PER_WEEK, MS_PER_DAY, MS_PER_HOUR, RETENTION_PERIODS } from '@bslt/shared';

import { runRetentionCycle, type AuditRetentionConfig } from '../audit/retention';
import { refreshExpiringOAuthTokens } from '../auth/oauth/refresh';
import { createUsageSnapshot } from '../billing/usage-metering';
import { expireStaleInvitations } from '../tenants/invitation-cleanup';
import { cleanupUserFiles, hardDeleteAnonymizedUsers } from '../users/data-hygiene';

import { anonymizeHardBannedUsers } from './hard-ban-anonymization';
import { anonymizeDeletedUsers } from './pii-anonymization';

import type { ScheduledTask, ScheduledTaskLogger, TaskTracker } from './types';
import type { DbClient, QueueStore, Repositories } from '../../../db/src';
import type { FileStorageProvider } from '../files/types';
import type { AuthConfig } from '@bslt/shared/config';

// ============================================================================
// Constants
// ============================================================================

/** One hour in milliseconds */
const ONE_HOUR_MS = MS_PER_HOUR;

/** One day in milliseconds */
const ONE_DAY_MS = MS_PER_DAY;

/** One week in milliseconds */
const ONE_WEEK_MS = DAYS_PER_WEEK * MS_PER_DAY;

// ============================================================================
// Task Registry
// ============================================================================

/**
 * Active task trackers (for cleanup on shutdown)
 */
const activeTaskTrackers: TaskTracker[] = [];

// ============================================================================
// Task Registration
// ============================================================================

/**
 * Optional configuration for scheduled task registration.
 */
export interface ScheduledTaskOptions {
  /** Database client (enables hard-delete task) */
  db?: DbClient;
  /** Queue store (enables completed-task cleanup) */
  queueStore?: QueueStore;
  /** Auth configuration (enables oauth-refresh task) */
  config?: AuthConfig;
  /** Storage provider for file cleanup and audit archiving */
  storage?: FileStorageProvider;
  /** Audit retention configuration (archive-before-delete, retention days) */
  auditRetention?: AuditRetentionConfig;
}

/**
 * Register and start all scheduled cleanup tasks
 *
 * @param repos - Repository container
 * @param log - Logger instance
 * @param db - Database client (optional, enables hard-delete task)
 * @param queueStore - Queue store (optional, enables completed-task cleanup)
 * @param config - Auth configuration (optional, enables oauth-refresh task)
 * @param storage - Storage provider (optional, enables file cleanup and audit archiving)
 * @param auditRetention - Audit retention config (optional, enables archive-before-delete)
 */
export function registerScheduledTasks(
  repos: Repositories,
  log: ScheduledTaskLogger,
  db?: DbClient,
  queueStore?: QueueStore,
  config?: AuthConfig,
  storage?: FileStorageProvider,
  auditRetention?: AuditRetentionConfig,
): void {
  // Clear any existing tasks (for hot reload in development)
  stopScheduledTasks();

  const tasks: ScheduledTask[] = [
    // Hourly job: Refresh expiring OAuth tokens
    ...(config !== undefined
      ? [
          {
            name: 'oauth-refresh',
            description: 'Proactively renew expiring OAuth tokens',
            schedule: 'hourly' as const,
            execute: async (): Promise<number> => {
              const result = await refreshExpiringOAuthTokens(repos, config, log);
              return result.refreshed;
            },
          },
        ]
      : []),

    // Hourly job: Handle expired trials
    {
      name: 'trial-expiry',
      description: 'Find and transition subscriptions with expired trials',
      schedule: 'hourly',
      execute: async (): Promise<number> => {
        const expired = await repos.subscriptions.findExpiredTrials();
        let affected = 0;
        for (const sub of expired) {
          try {
            // Transition trialing -> active or trialing -> past_due
            // For now, we transition to active if we have a payment method,
            // otherwise past_due. Most providers handle this, but we need
            // to keep our DB in sync.
            const pms = await repos.paymentMethods.findByUserId(sub.userId);
            const hasPaymentMethod = pms.some((pm) => pm.isDefault);

            await repos.subscriptions.update(sub.id, {
              status: hasPaymentMethod ? 'active' : 'past_due',
              updatedAt: new Date(),
            });
            affected++;
          } catch (err) {
            log.error({ err, subId: sub.id }, 'Failed to transition expired trial');
          }
        }
        return affected;
      },
    },

    // Hourly job: Snapshot usage metrics for all tenants
    {
      name: 'usage-snapshot',
      description: 'Create hourly snapshots of usage metrics for all tenants',
      schedule: 'hourly',
      execute: async (): Promise<number> => {
        let snapshotCount = 0;
        try {
          const meteringRepos = {
            usageMetrics: repos.usageMetrics,
            usageSnapshots: repos.usageSnapshots,
          };
          // Collect unique tenant IDs from recent snapshots
          const tenantIds = new Set<string>();
          const allSnapshots = await repos.usageSnapshots.findByTenantId('', 100);
          for (const s of allSnapshots) {
            tenantIds.add(s.tenantId);
          }
          // Snapshot each tenant
          for (const tenantId of tenantIds) {
            try {
              const snapshots = await createUsageSnapshot(meteringRepos, tenantId);
              snapshotCount += snapshots.length;
            } catch (err) {
              log.error(
                { err, tenantId, task: 'usage-snapshot' },
                'Failed to snapshot usage for tenant',
              );
            }
          }
        } catch (err) {
          log.error({ err, task: 'usage-snapshot' }, 'Usage snapshot task failed');
        }
        return snapshotCount;
      },
    },

    // Daily cleanup: Login attempts older than 90 days
    {
      name: 'login-cleanup',
      description: 'Delete login attempts older than 90 days',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const cutoff = new Date(Date.now() - RETENTION_PERIODS.LOGIN_ATTEMPTS_DAYS * ONE_DAY_MS);
        const count = await repos.loginAttempts.deleteOlderThan(cutoff.toISOString());
        log.info({ task: 'login-cleanup', deleted: count }, 'Login attempts cleanup completed');
        return count;
      },
    },

    // Daily cleanup: Expired auth tokens (password reset, email verification, email change, magic link)
    {
      name: 'auth-tokens-cleanup',
      description: 'Delete expired auth tokens',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const count = await repos.authTokens.deleteExpired();
        log.info({ task: 'auth-tokens-cleanup', deleted: count }, 'Auth tokens cleanup completed');
        return count;
      },
    },

    // Weekly cleanup: Expired push subscriptions
    {
      name: 'push-cleanup',
      description: 'Delete expired push subscriptions',
      schedule: 'weekly',
      execute: async (): Promise<number> => {
        const count = await repos.pushSubscriptions.deleteExpired();
        log.info({ task: 'push-cleanup', deleted: count }, 'Push subscriptions cleanup completed');
        return count;
      },
    },

    // Daily cleanup: Revoked sessions older than 30 days
    {
      name: 'session-cleanup',
      description: 'Delete revoked sessions older than 30 days',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const cutoff = new Date(Date.now() - RETENTION_PERIODS.SESSIONS_DAYS * ONE_DAY_MS);
        const count = await repos.userSessions.deleteRevokedBefore(cutoff.toISOString());
        log.info({ task: 'session-cleanup', deleted: count }, 'Sessions cleanup completed');
        return count;
      },
    },

    // Daily cleanup: Audit retention cycle (archive + purge) — Sprint 3.3
    {
      name: 'audit-retention',
      description: 'Archive (if enabled) and purge audit events older than retention period',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const result = await runRetentionCycle(
          repos.auditEvents,
          log,
          auditRetention ?? {},
          storage,
        );
        return (result.archive?.archivedCount ?? 0) + result.purge.purgedCount;
      },
    },

    // Daily cleanup: Billing events older than 90 days
    {
      name: 'billing-events-cleanup',
      description: 'Delete billing events older than 90 days',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const cutoff = new Date(Date.now() - RETENTION_PERIODS.BILLING_EVENTS_DAYS * ONE_DAY_MS);
        const count = await repos.billingEvents.deleteOlderThan(cutoff);
        log.info(
          { task: 'billing-events-cleanup', deleted: count },
          'Billing events cleanup completed',
        );
        return count;
      },
    },

    // Daily cleanup: Expire stale invitations
    {
      name: 'invitation-cleanup',
      description: 'Mark pending invitations past expiry as expired',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const result = await expireStaleInvitations(repos, log);
        return result.expiredCount;
      },
    },

    // Daily job: Anonymize PII for deleted users past grace period
    {
      name: 'pii-anonymization',
      description: 'Anonymize PII for users deleted longer than grace period',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        return anonymizeDeletedUsers(repos, RETENTION_PERIODS.PII_GRACE_DAYS, log);
      },
    },

    // Daily job: Anonymize PII for hard-banned users past grace period (Sprint 3.15)
    {
      name: 'hard-ban-anonymization',
      description: 'Anonymize PII for hard-banned users past grace period',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        return anonymizeHardBannedUsers(repos, log);
      },
    },

    // Daily cleanup: Expired data export requests
    {
      name: 'data-export-cleanup',
      description: 'Delete expired data export requests',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const count = await repos.dataExportRequests.deleteExpired();
        log.info(
          { task: 'data-export-cleanup', deleted: count },
          'Data export requests cleanup completed',
        );
        return count;
      },
    },

    // Weekly cleanup: Completed queue tasks older than 7 days
    ...(queueStore !== undefined
      ? [
          {
            name: 'queue-cleanup',
            description: 'Clear completed queue tasks older than 7 days',
            schedule: 'weekly' as const,
            execute: async (): Promise<number> => {
              const cutoff = new Date(Date.now() - ONE_WEEK_MS).toISOString();
              const count = await queueStore.clearCompleted(cutoff);
              log.info(
                { task: 'queue-cleanup', cleared: count },
                'Completed queue tasks cleanup completed',
              );
              return count;
            },
          },
        ]
      : []),

    // Daily job: Hard-delete anonymized users past retention period
    ...(db !== undefined
      ? [
          {
            name: 'hard-delete-anonymized',
            description: 'Permanently delete anonymized user records past retention period',
            schedule: 'daily' as const,
            execute: async (): Promise<number> => {
              const result = await hardDeleteAnonymizedUsers(
                db,
                log,
                RETENTION_PERIODS.HARD_DELETE_DAYS,
              );
              return result.deletedCount;
            },
          },
        ]
      : []),

    // Daily job: Clean up files for anonymized users — Sprint 3.16
    ...(storage !== undefined
      ? [
          {
            name: 'data-hygiene-files',
            description: 'Delete stored files (avatars, uploads) for anonymized users',
            schedule: 'daily' as const,
            execute: async (): Promise<number> => {
              // Find recently anonymized users who may still have orphaned files
              const allUsers = await repos.users.listWithFilters({ limit: 10000 });
              const anonymizedUsers = allUsers.data.filter(
                (user) =>
                  user.deletedAt !== null &&
                  user.avatarUrl === null &&
                  user.email.includes('@anonymized.local'),
              );

              let cleanedCount = 0;
              for (const user of anonymizedUsers) {
                try {
                  const result = await cleanupUserFiles(repos, storage, user.id, log);
                  cleanedCount += result.deletedRecordCount;
                } catch (error) {
                  log.error(
                    {
                      userId: user.id,
                      error: error instanceof Error ? error.message : String(error),
                    },
                    'Failed to clean up files for anonymized user',
                  );
                }
              }
              return cleanedCount;
            },
          },
        ]
      : []),
  ];

  // Register each task with its interval
  for (const task of tasks) {
    let intervalMs: number;
    switch (task.schedule) {
      case 'hourly':
        intervalMs = ONE_HOUR_MS;
        break;
      case 'daily':
        intervalMs = ONE_DAY_MS;
        break;
      case 'weekly':
        intervalMs = ONE_WEEK_MS;
        break;
    }

    // Run immediately on startup
    void executeTask(task, log);

    // Schedule recurring execution
    const intervalId = setInterval(() => {
      void executeTask(task, log);
    }, intervalMs);

    activeTaskTrackers.push({ task, intervalId });
  }

  log.info({ taskCount: tasks.length }, 'Scheduled tasks registered');
}

/**
 * Execute a single task with error handling
 *
 * @param task - The task to execute
 * @param log - Logger instance
 */
async function executeTask(task: ScheduledTask, log: ScheduledTaskLogger): Promise<void> {
  try {
    log.info({ task: task.name, schedule: task.schedule }, 'Starting scheduled task');
    const affectedCount = await task.execute();
    log.info({ task: task.name, affectedCount }, 'Scheduled task completed');
  } catch (error) {
    log.error(
      {
        task: task.name,
        error: error instanceof Error ? error.message : String(error),
      },
      'Scheduled task failed',
    );
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Stop all scheduled tasks and clear intervals
 * Should be called during graceful shutdown
 */
export function stopScheduledTasks(): void {
  for (const tracker of activeTaskTrackers) {
    clearInterval(tracker.intervalId);
  }
  activeTaskTrackers.length = 0;
}
