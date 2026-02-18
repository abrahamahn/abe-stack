// main/server/core/src/admin/types.ts
/**
 * Admin Module Types
 *
 * Dependency interfaces for the admin module.
 * The server provides these dependencies when registering the admin module.
 */

import type {
  AuditEventRepository,
  DbClient,
  PlanRepository,
  Repositories,
  SubscriptionRepository,
  UserRepository,
} from '../../../db/src';
import type {
  BaseContext,
  ContractRequestContext as RequestContext,
  HasBilling,
  HasCache,
  HasEmail,
  HasNotifications,
  HasPubSub,
  HasStorage,
  Logger,
} from '@abe-stack/shared';
import type { BillingConfig } from '@abe-stack/shared/config';

/**
 * Application context narrowed for the admin module.
 *
 * Extends `BaseContext` with the specific services admin handlers require.
 * The server's full `AppContext` structurally satisfies this interface.
 */
export interface AdminAppContext
  extends BaseContext,
    HasEmail,
    HasStorage,
    HasBilling,
    HasNotifications,
    HasPubSub,
    HasCache {
  readonly db: DbClient;
  readonly repos: {
    readonly users: UserRepository;
    readonly plans: PlanRepository;
    readonly subscriptions: SubscriptionRepository;
    readonly auditEvents: AuditEventRepository;
    readonly tenants: Repositories['tenants'];
    readonly memberships: Repositories['memberships'];
  };
  readonly config: {
    readonly billing: BillingConfig;
  };
  readonly log: Logger;
  readonly queue: unknown;
  readonly write: unknown;
  readonly search: unknown;
}

/**
 * Request type used by admin handlers.
 */
export type AdminRequest = RequestContext;
