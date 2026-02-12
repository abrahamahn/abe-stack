// src/shared/src/domain/admin/admin.display.ts

import type { UserStatus } from './admin.schemas';

// ============================================================================
// User Status Display
// ============================================================================

/**
 * Get a human-readable label for a user status.
 */
export function getUserStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    active: 'Active',
    locked: 'Locked',
    unverified: 'Unverified',
  };
  return labels[status];
}

/**
 * Get the badge tone for a user status.
 */
export function getUserStatusTone(status: UserStatus): 'info' | 'success' | 'warning' | 'danger' {
  const tones: Record<UserStatus, 'info' | 'success' | 'warning' | 'danger'> = {
    active: 'success',
    locked: 'danger',
    unverified: 'warning',
  };
  return tones[status];
}

// ============================================================================
// Security Severity Display
// ============================================================================

/**
 * Get the badge tone for a security event severity.
 */
export function getSecuritySeverityTone(
  severity: string,
): 'info' | 'success' | 'warning' | 'danger' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
}

/**
 * Format a security event type for display (e.g. 'login_failure' -> 'Login Failure').
 */
export function formatSecurityEventType(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// App Role Display
// ============================================================================

/**
 * Get a human-readable label for an app role.
 */
export function getAppRoleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get the badge tone for an app role.
 */
export function getAppRoleTone(role: string): 'info' | 'success' | 'warning' | 'danger' {
  switch (role) {
    case 'admin':
      return 'danger';
    case 'moderator':
      return 'warning';
    default:
      return 'info';
  }
}
