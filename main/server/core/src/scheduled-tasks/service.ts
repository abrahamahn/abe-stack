// main/server/core/src/scheduled-tasks/service.ts
/**
 * Scheduled Task Service
 *
 * Manages background cleanup tasks that run on regular intervals.
 * Uses setInterval for scheduling without external dependencies.
 *
 * @module
 */

import { DAYS_PER_WEEK, MS_PER_DAY, MS_PER_HOUR, RETENTION_PERIODS } from '@abe-stack/shared';

import { refreshExpiringOAuthTokens } from '../auth/oauth/refresh';
import { expireStaleInvitations } from '../tenants/invitation-cleanup';
import { hardDeleteAnonymizedUsers } from '../users/data-hygiene';

import { anonymizeDeletedUsers } from './pii-anonymization';

import type { ScheduledTask, ScheduledTaskLogger, TaskTracker } from './types';
import type { DbClient, QueueStore, Repositories } from '../../../db/src';
import type { AuthConfig } from '@abe-stack/shared/config';

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
 * Register and start all scheduled cleanup tasks
 *
 * @param repos - Repository container
 * @param log - Logger instance
 * @param db - Database client (optional, enables hard-delete task)
 * @param queueStore - Queue store (optional, enables completed-task cleanup)
 * @param config - Auth configuration (optional, enables oauth-refresh task)
 */
export function registerScheduledTasks(
  repos: Repositories,
  log: ScheduledTaskLogger,
  db?: DbClient,
  queueStore?: QueueStore,
  config?: AuthConfig,
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

    // Daily cleanup: Expired magic link tokens
    {
      name: 'magic-link-cleanup',
      description: 'Delete expired magic link tokens',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const count = await repos.magicLinkTokens.deleteExpired();
        log.info(
          { task: 'magic-link-cleanup', deleted: count },
          'Magic link tokens cleanup completed',
        );
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

    // Daily cleanup: Audit events older than retention period
    {
      name: 'audit-cleanup',
      description: 'Delete audit events older than 90 days',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const cutoff = new Date(Date.now() - RETENTION_PERIODS.AUDIT_DAYS * ONE_DAY_MS);
        const count = await repos.auditEvents.deleteOlderThan(cutoff.toISOString());
        log.info(
          { task: 'audit-cleanup', deleted: count, retentionDays: RETENTION_PERIODS.AUDIT_DAYS },
          'Audit events cleanup completed',
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

    // Daily cleanup: Expired password reset tokens
    {
      name: 'password-reset-cleanup',
      description: 'Delete expired password reset tokens',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const count = await repos.passwordResetTokens.deleteExpired();
        log.info(
          { task: 'password-reset-cleanup', deleted: count },
          'Password reset tokens cleanup completed',
        );
        return count;
      },
    },

    // Daily cleanup: Expired email verification tokens
    {
      name: 'email-verification-cleanup',
      description: 'Delete expired email verification tokens',
      schedule: 'daily',
      execute: async (): Promise<number> => {
        const count = await repos.emailVerificationTokens.deleteExpired();
        log.info(
          { task: 'email-verification-cleanup', deleted: count },
          'Email verification tokens cleanup completed',
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
