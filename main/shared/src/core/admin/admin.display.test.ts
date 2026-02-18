// main/shared/src/core/admin/admin.display.test.ts

import { describe, expect, it } from 'vitest';

import {
  formatSecurityEventType,
  getAppRoleLabel,
  getAppRoleTone,
  getSecuritySeverityTone,
  getUserStatusLabel,
  getUserStatusTone,
} from './admin.display';
import { USER_STATUSES } from './admin.schemas';

import type { UserStatus } from './admin.schemas';

describe('admin.display', () => {
  describe('getUserStatusLabel', () => {
    const expectedLabels: Record<UserStatus, string> = {
      active: 'Active',
      locked: 'Locked',
      unverified: 'Unverified',
    };

    it('returns a label for every user status', () => {
      for (const status of USER_STATUSES) {
        expect(getUserStatusLabel(status)).toBe(expectedLabels[status]);
      }
    });
  });

  describe('getUserStatusTone', () => {
    const expectedTones: Record<UserStatus, string> = {
      active: 'success',
      locked: 'danger',
      unverified: 'warning',
    };

    it('returns a tone for every user status', () => {
      for (const status of USER_STATUSES) {
        expect(getUserStatusTone(status)).toBe(expectedTones[status]);
      }
    });
  });

  describe('getSecuritySeverityTone', () => {
    it('returns danger for critical and high', () => {
      expect(getSecuritySeverityTone('critical')).toBe('danger');
      expect(getSecuritySeverityTone('high')).toBe('danger');
    });

    it('returns warning for medium', () => {
      expect(getSecuritySeverityTone('medium')).toBe('warning');
    });

    it('returns success for low', () => {
      expect(getSecuritySeverityTone('low')).toBe('success');
    });

    it('defaults to info for unknown severity', () => {
      expect(getSecuritySeverityTone('unknown')).toBe('info');
    });
  });

  describe('formatSecurityEventType', () => {
    it('converts snake_case to title case', () => {
      expect(formatSecurityEventType('login_failure')).toBe('Login Failure');
      expect(formatSecurityEventType('token_reuse_detected')).toBe('Token Reuse Detected');
    });

    it('handles single word', () => {
      expect(formatSecurityEventType('logout')).toBe('Logout');
    });
  });

  describe('getAppRoleLabel', () => {
    it('capitalizes role names', () => {
      expect(getAppRoleLabel('user')).toBe('User');
      expect(getAppRoleLabel('admin')).toBe('Admin');
      expect(getAppRoleLabel('moderator')).toBe('Moderator');
    });
  });

  describe('getAppRoleTone', () => {
    it('returns danger for admin', () => {
      expect(getAppRoleTone('admin')).toBe('danger');
    });

    it('returns warning for moderator', () => {
      expect(getAppRoleTone('moderator')).toBe('warning');
    });

    it('returns info for user', () => {
      expect(getAppRoleTone('user')).toBe('info');
    });

    it('defaults to info for unknown role', () => {
      expect(getAppRoleTone('unknown')).toBe('info');
    });
  });
});
