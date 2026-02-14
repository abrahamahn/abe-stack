// main/server/core/src/audit/types.ts
/**
 * Audit Module Types
 *
 * Type definitions for the general-purpose audit logging service.
 * Covers billing, role changes, settings, and other domain events
 * beyond auth-specific security events.
 *
 * @module audit/types
 */

import type { AuditEventRepository } from '../../../db/src';

// ============================================================================
// Audit Categories
// ============================================================================

/** Predefined audit action categories for common domain events */
export type AuditAction =
  // Billing events
  | 'billing.plan_changed'
  | 'billing.subscription_created'
  | 'billing.subscription_canceled'
  | 'billing.subscription_resumed'
  | 'billing.payment_method_added'
  | 'billing.payment_method_removed'
  // Role events
  | 'role.assigned'
  | 'role.removed'
  | 'role.changed'
  // Settings events
  | 'settings.updated'
  | 'settings.profile_updated'
  // Project/workspace events
  | 'project.created'
  | 'project.deleted'
  | 'workspace.created'
  | 'workspace.deleted'
  | 'workspace.member_added'
  | 'workspace.member_removed'
  // Generic
  | (string & {});

// ============================================================================
// Audit Record Params
// ============================================================================

/**
 * Parameters for recording an audit event.
 * Designed for ease of use at call sites while mapping to the
 * underlying `NewAuditEvent` DB schema.
 */
export interface AuditRecordParams {
  /** User ID of the actor performing the action */
  actorId: string;
  /** Action identifier in "noun.verb" format (e.g., "billing.plan_changed") */
  action: AuditAction;
  /** Resource type being acted upon (e.g., "subscription", "workspace", "user") */
  resource: string;
  /** Specific resource ID (e.g., subscription ID, workspace ID) */
  resourceId?: string | null;
  /** Optional tenant/workspace context */
  tenantId?: string | null;
  /** Additional event metadata */
  metadata?: Record<string, unknown>;
  /** Client IP address */
  ipAddress?: string | null;
  /** Client user agent */
  userAgent?: string | null;
  /** Event severity (defaults to 'info') */
  severity?: 'info' | 'warn' | 'error' | 'critical';
  /** Event category (defaults based on action prefix) */
  category?: 'security' | 'admin' | 'system' | 'billing';
}

// ============================================================================
// Audit Service Dependencies
// ============================================================================

/** Dependencies required by the audit service */
export interface AuditDeps {
  /** Repository for persisting audit events */
  auditEvents: AuditEventRepository;
}
