// main/shared/src/system/constants/audit.ts
/**
 * Audit Log Constants
 *
 * Categories and severity levels for audit events.
 */

export const AUDIT_CATEGORIES = ['security', 'admin', 'system', 'billing'] as const;
export const AUDIT_SEVERITIES = ['info', 'warn', 'error', 'critical'] as const;
