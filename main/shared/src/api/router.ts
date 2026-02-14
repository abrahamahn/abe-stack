// main/shared/src/api/router.ts
/**
 * Central API Router
 *
 * Single source of truth for HTTP contract groups used by server and clients.
 * This composes domain contracts without changing runtime behavior.
 */

import { adminContract } from '../domain/admin';
import { apiKeysContract } from '../domain/api-keys';
import { auditLogContract } from '../domain/audit-log/audit-log.contracts';
import { authContract } from '../domain/auth';
import { billingContract } from '../domain/billing';
import { jobsContract } from '../domain/jobs/jobs.contracts';
import { notificationsContract } from '../domain/notifications';
import { usersContract } from '../domain/users';
import { webhooksContract } from '../domain/webhooks';

import type { ContractRouter } from '../core/api';

export const apiRouter = {
  admin: adminContract,
  apiKeys: apiKeysContract,
  auditLog: auditLogContract,
  auth: authContract,
  billing: billingContract,
  jobs: jobsContract,
  notifications: notificationsContract,
  users: usersContract,
  webhooks: webhooksContract,
} as const satisfies ContractRouter;

export type ApiRouter = typeof apiRouter;
export type ApiDomain = keyof ApiRouter;
