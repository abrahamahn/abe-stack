// src/shared/src/domain/sessions/sessions.logic.test.ts
import { describe, expect, it } from 'vitest';

import { getSessionAge, isSessionActive, isSessionRevoked } from './sessions.logic';

describe('sessions.logic', () => {
  // ==========================================================================
  // isSessionActive
  // ==========================================================================
  describe('isSessionActive', () => {
    it('returns true when revokedAt is null', () => {
      expect(isSessionActive({ revokedAt: null })).toBe(true);
    });

    it('returns false when revokedAt is set', () => {
      expect(isSessionActive({ revokedAt: new Date('2026-01-15T12:00:00Z') })).toBe(false);
    });
  });

  // ==========================================================================
  // isSessionRevoked
  // ==========================================================================
  describe('isSessionRevoked', () => {
    it('returns false when revokedAt is null', () => {
      expect(isSessionRevoked({ revokedAt: null })).toBe(false);
    });

    it('returns true when revokedAt is set', () => {
      expect(isSessionRevoked({ revokedAt: new Date('2026-01-15T12:00:00Z') })).toBe(true);
    });

    it('is the logical inverse of isSessionActive', () => {
      const activeSession = { revokedAt: null };
      const revokedSession = { revokedAt: new Date() };
      expect(isSessionActive(activeSession)).toBe(!isSessionRevoked(activeSession));
      expect(isSessionActive(revokedSession)).toBe(!isSessionRevoked(revokedSession));
    });
  });

  // ==========================================================================
  // getSessionAge
  // ==========================================================================
  describe('getSessionAge', () => {
    it('calculates age from creation to now', () => {
      const now = Date.now();
      const createdAt = new Date(now - 60_000); // 60 seconds ago
      expect(getSessionAge({ createdAt }, now)).toBe(60_000);
    });

    it('returns 0 for a session created at reference time', () => {
      const now = Date.now();
      const createdAt = new Date(now);
      expect(getSessionAge({ createdAt }, now)).toBe(0);
    });

    it('returns negative value for a future-created session', () => {
      const now = Date.now();
      const createdAt = new Date(now + 10_000);
      expect(getSessionAge({ createdAt }, now)).toBe(-10_000);
    });

    it('uses Date.now() as default reference time', () => {
      const createdAt = new Date(Date.now() - 1000);
      const age = getSessionAge({ createdAt });
      // Age should be approximately 1000ms (allow small drift)
      expect(age).toBeGreaterThanOrEqual(1000);
      expect(age).toBeLessThan(2000);
    });

    it('handles very old sessions', () => {
      const now = Date.now();
      const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
      const age = getSessionAge({ createdAt: oneYearAgo }, now);
      expect(age).toBe(365 * 24 * 60 * 60 * 1000);
    });
  });
});
