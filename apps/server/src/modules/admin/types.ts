// modules/admin/src/types.ts
/**
 * Admin Module Types
 *
 * Dependency interfaces for the admin module.
 * The server provides these dependencies when registering the admin module.
 */

import type {
  DbClient,
  PlanRepository,
  SubscriptionRepository,
  UserRepository,
} from '@abe-stack/db';
import type { BillingConfig } from '@abe-stack/shared';
import type { BaseContext, RequestContext } from '@abe-stack/shared';

/**
 * Application context narrowed for the admin module.
 *
 * Extends `BaseContext` with the specific services admin handlers require.
 * The server's full `AppContext` structurally satisfies this interface.
 */
export interface AdminAppContext extends BaseContext {
  readonly db: DbClient;
  readonly repos: {
    readonly users: UserRepository;
    readonly plans: PlanRepository;
    readonly subscriptions: SubscriptionRepository;
  };
  readonly config: {
    readonly billing: BillingConfig;
  };
}

/**
 * Request type used by admin handlers.
 */
export type AdminRequest = RequestContext;
