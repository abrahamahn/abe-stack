// main/server/core/src/audit/service.ts
/**
 * Audit Service
 *
 * General-purpose audit logging for domain events beyond auth security.
 * Records billing changes, role assignments, settings updates, and
 * other actions to the audit_events table.
 *
 * @module audit/service
 */

import type { AuditDeps, AuditRecordParams } from './types';
import type { AuditEvent } from '../../../db/src';

// ============================================================================
// Category Inference
// ============================================================================

/**
 * Infer the audit category from the action prefix.
 *
 * @param action - Action string in "noun.verb" format
 * @returns Inferred category
 * @complexity O(1)
 */
function inferCategory(action: string): 'security' | 'admin' | 'system' | 'billing' {
  if (action.startsWith('billing.')) return 'billing';
  if (action.startsWith('role.') || action.startsWith('workspace.')) return 'admin';
  if (action.startsWith('settings.') || action.startsWith('project.')) return 'system';
  return 'system';
}

// ============================================================================
// Audit Record
// ============================================================================

/**
 * Record a general-purpose audit event.
 *
 * Inserts a row into the `audit_events` table with the provided
 * actor, action, resource, and optional metadata. Category and
 * severity are inferred from the action if not explicitly provided.
 *
 * @param deps - Audit dependencies (audit event repository)
 * @param params - Audit event parameters
 * @returns The created audit event
 * @complexity O(1) - single database insert
 *
 * @example
 * ```typescript
 * await record(deps, {
 *   actorId: userId,
 *   action: 'billing.plan_changed',
 *   resource: 'subscription',
 *   resourceId: subscriptionId,
 *   metadata: { oldPlanId, newPlanId },
 * });
 * ```
 */
export async function record(deps: AuditDeps, params: AuditRecordParams): Promise<AuditEvent> {
  const {
    actorId,
    action,
    resource,
    resourceId,
    tenantId,
    metadata,
    ipAddress,
    userAgent,
    severity = 'info',
    category,
  } = params;

  return await deps.auditEvents.create({
    actorId,
    action,
    resource,
    resourceId: resourceId ?? null,
    tenantId: tenantId ?? null,
    category: category ?? inferCategory(action),
    severity,
    metadata: metadata ?? {},
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}
