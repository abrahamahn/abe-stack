// main/shared/src/core/tenant/membership.display.test.ts
/**
 * @file Membership Display Tests
 * @description Tests for badge tone functions.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import { getInvitationStatusTone, getTenantRoleTone } from './membership.display';
import { INVITATION_STATUSES } from './membership.schemas';

import type { InvitationStatus } from './membership.schemas';

describe('membership.display', () => {
  // ==========================================================================
  // getTenantRoleTone
  // ==========================================================================
  describe('getTenantRoleTone', () => {
    it('returns danger for owner', () => {
      expect(getTenantRoleTone('owner')).toBe('danger');
    });

    it('returns warning for admin', () => {
      expect(getTenantRoleTone('admin')).toBe('warning');
    });

    it('returns info for member', () => {
      expect(getTenantRoleTone('member')).toBe('info');
    });

    it('returns success for viewer', () => {
      expect(getTenantRoleTone('viewer')).toBe('success');
    });

    it('defaults to info for unknown role', () => {
      expect(getTenantRoleTone('unknown')).toBe('info');
    });
  });

  // ==========================================================================
  // getInvitationStatusTone
  // ==========================================================================
  describe('getInvitationStatusTone', () => {
    const expectedTones: Record<InvitationStatus, string> = {
      pending: 'info',
      accepted: 'success',
      revoked: 'danger',
      expired: 'warning',
    };

    it('returns a tone for every invitation status', () => {
      for (const status of INVITATION_STATUSES) {
        expect(getInvitationStatusTone(status)).toBe(expectedTones[status]);
      }
    });
  });
});
