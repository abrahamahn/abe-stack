// main/shared/src/api/router.ts
/**
 * Central API Router
 *
 * Single source of truth for HTTP contract groups used by server and clients.
 * This composes domain contracts without changing runtime behavior.
 */

import {
  adminContract,
  apiKeysContract,
  auditLogContract,
  authContract,
  billingContract,
  jobsContract,
  notificationsContract,
  usersContract,
  webhooksContract,
} from '../contracts';

import type { ContractRouter } from '../primitives/api';

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
