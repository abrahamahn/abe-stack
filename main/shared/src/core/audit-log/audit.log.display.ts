// src/core/audit-log/audit.log.display.ts

/**
 * @file Audit Log Display
 * @description Display tone mappings for audit actions and severity levels.
 * @module Core/AuditLog
 */

// ============================================================================
// Constants
// ============================================================================

const ACTION_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  invite: 'info',
  remove: 'warning',
};

const SEVERITY_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  warn: 'warning',
  error: 'danger',
  critical: 'danger',
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the badge tone for an audit action.
 * Extracts the action prefix (e.g. 'create' from 'create.user') and maps to a tone.
 */
export function getAuditActionTone(action: string): 'info' | 'success' | 'warning' | 'danger' {
  const prefix = action.split('.')[0] ?? '';
  return ACTION_TONES[prefix] ?? 'info';
}

/**
 * Get the badge tone for an audit severity level.
 */
export function getAuditSeverityTone(severity: string): 'info' | 'success' | 'warning' | 'danger' {
  return SEVERITY_TONES[severity] ?? 'info';
}
