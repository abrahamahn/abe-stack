// main/server/core/src/activities/types.ts
/**
 * Activities Module Types
 *
 * Narrow dependency interfaces for the activities package.
 * Decouples activity logic from concrete server implementations,
 * keeping the package framework-agnostic.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type { ActivityRepository, AuditEventRepository } from '../../../db/src';
import type { BaseContext } from '@abe-stack/shared';

// ============================================================================
// Handler Context
// ============================================================================

/**
 * Application context for activity handlers.
 *
 * Extends `BaseContext` with activity-specific repository access.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 *
 * @param repos - Database repositories including activities
 * @param log - Logger instance
 */
export interface ActivityAppContext extends BaseContext {
  readonly repos: {
    readonly activities: ActivityRepository;
    readonly auditEvents?: AuditEventRepository;
  };
}
