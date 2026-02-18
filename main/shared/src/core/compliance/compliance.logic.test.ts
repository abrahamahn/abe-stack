// main/shared/src/core/compliance/compliance.logic.test.ts

/**
 * @file Compliance Logic Unit Tests
 * @description Tests for legal document acceptance and consent evaluation functions.
 * @module Core/Compliance/Tests
 */

import { describe, expect, it } from 'vitest';

import { getEffectiveConsent, isConsentGranted, needsReacceptance } from './compliance.logic';

const uuid1 = '00000000-0000-4000-a000-000000000001' as string & { readonly brand: unique symbol };
const uuid2 = '00000000-0000-4000-a000-000000000002' as string & { readonly brand: unique symbol };
const uuid3 = '00000000-0000-4000-a000-000000000003' as string & { readonly brand: unique symbol };

describe('compliance.logic', () => {
  // ==========================================================================
  // needsReacceptance
  // ==========================================================================
  describe('needsReacceptance', () => {
    it('returns false when agreement points to the latest document', () => {
      expect(
        needsReacceptance(
          { documentId: uuid1 },
          { id: uuid1, version: 2 },
          { id: uuid1, version: 2 },
        ),
      ).toBe(false);
    });

    it('returns true when latest doc version is higher than agreed version', () => {
      expect(
        needsReacceptance(
          { documentId: uuid1 },
          { id: uuid2, version: 3 },
          { id: uuid1, version: 2 },
        ),
      ).toBe(true);
    });

    it('returns false when latest doc version equals agreed version (different IDs)', () => {
      expect(
        needsReacceptance(
          { documentId: uuid1 },
          { id: uuid2, version: 2 },
          { id: uuid1, version: 2 },
        ),
      ).toBe(false);
    });

    it('returns false when agreed version is higher than latest (edge case)', () => {
      expect(
        needsReacceptance(
          { documentId: uuid1 },
          { id: uuid2, version: 1 },
          { id: uuid1, version: 2 },
        ),
      ).toBe(false);
    });

    it('handles version 1 to version 2 upgrade', () => {
      expect(
        needsReacceptance(
          { documentId: uuid1 },
          { id: uuid3, version: 2 },
          { id: uuid1, version: 1 },
        ),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // isConsentGranted
  // ==========================================================================
  describe('isConsentGranted', () => {
    it('returns true when granted is true', () => {
      expect(isConsentGranted({ granted: true })).toBe(true);
    });

    it('returns false when granted is false', () => {
      expect(isConsentGranted({ granted: false })).toBe(false);
    });
  });

  // ==========================================================================
  // getEffectiveConsent
  // ==========================================================================
  describe('getEffectiveConsent', () => {
    it('returns null for empty log array', () => {
      expect(getEffectiveConsent([])).toBeNull();
    });

    it('returns true when last entry is a grant', () => {
      expect(getEffectiveConsent([{ granted: false }, { granted: true }])).toBe(true);
    });

    it('returns false when last entry is a revocation', () => {
      expect(getEffectiveConsent([{ granted: true }, { granted: false }])).toBe(false);
    });

    it('returns the single entry value', () => {
      expect(getEffectiveConsent([{ granted: true }])).toBe(true);
      expect(getEffectiveConsent([{ granted: false }])).toBe(false);
    });

    it('handles multiple toggles — last entry wins', () => {
      expect(
        getEffectiveConsent([
          { granted: false },
          { granted: true },
          { granted: false },
          { granted: true },
          { granted: false },
        ]),
      ).toBe(false);
    });

    it('handles all grants', () => {
      expect(getEffectiveConsent([{ granted: true }, { granted: true }, { granted: true }])).toBe(
        true,
      );
    });

    it('handles all revocations', () => {
      expect(getEffectiveConsent([{ granted: false }, { granted: false }])).toBe(false);
    });
  });
});
