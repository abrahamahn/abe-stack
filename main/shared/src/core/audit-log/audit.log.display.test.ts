// src/core/audit-log/audit.log.display.test.ts

/**
 * @file Audit Log Display Tests
 * @description Tests for audit display tone mappings.
 * @module Core/AuditLog/Tests
 */

import { describe, expect, it } from 'vitest';

import { AUDIT_SEVERITIES } from '../constants/notifications';
import { getAuditActionTone, getAuditSeverityTone } from './audit.log.display';

import type { AuditSeverity } from './audit.log.schemas';

// ============================================================================
// getAuditActionTone
// ============================================================================

describe('getAuditActionTone', () => {
  it('returns success for create actions', () => {
    expect(getAuditActionTone('create')).toBe('success');
    expect(getAuditActionTone('create.user')).toBe('success');
  });

  it('returns info for update actions', () => {
    expect(getAuditActionTone('update')).toBe('info');
    expect(getAuditActionTone('update.role')).toBe('info');
  });

  it('returns danger for delete actions', () => {
    expect(getAuditActionTone('delete')).toBe('danger');
    expect(getAuditActionTone('delete.tenant')).toBe('danger');
  });

  it('returns info for invite actions', () => {
    expect(getAuditActionTone('invite')).toBe('info');
    expect(getAuditActionTone('invite.member')).toBe('info');
  });

  it('returns warning for remove actions', () => {
    expect(getAuditActionTone('remove')).toBe('warning');
    expect(getAuditActionTone('remove.member')).toBe('warning');
  });

  it('defaults to info for unknown actions', () => {
    expect(getAuditActionTone('unknown')).toBe('info');
    expect(getAuditActionTone('')).toBe('info');
  });
});

// ============================================================================
// getAuditSeverityTone
// ============================================================================

describe('getAuditSeverityTone', () => {
  const expectedTones: Record<AuditSeverity, string> = {
    info: 'info',
    warn: 'warning',
    error: 'danger',
    critical: 'danger',
  };

  it('returns a tone for every audit severity', () => {
    for (const severity of AUDIT_SEVERITIES) {
      expect(getAuditSeverityTone(severity)).toBe(expectedTones[severity]);
    }
  });
});
