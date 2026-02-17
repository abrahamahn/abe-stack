// main/shared/src/engine/jobs/jobs.logic.test.ts
import { describe, expect, it } from 'vitest';

import { calculateBackoff, canRetry, isTerminalStatus, shouldProcess } from './jobs.logic';

import type { JobStatus } from './jobs.schemas';

describe('jobs.logic', () => {
  // ==========================================================================
  // isTerminalStatus
  // ==========================================================================
  describe('isTerminalStatus', () => {
    it('returns true for "completed"', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('returns true for "failed"', () => {
      expect(isTerminalStatus('failed')).toBe(true);
    });

    it('returns true for "dead_letter"', () => {
      expect(isTerminalStatus('dead_letter')).toBe(true);
    });

    it('returns true for "cancelled"', () => {
      expect(isTerminalStatus('cancelled')).toBe(true);
    });

    it('returns false for "pending"', () => {
      expect(isTerminalStatus('pending')).toBe(false);
    });

    it('returns false for "processing"', () => {
      expect(isTerminalStatus('processing')).toBe(false);
    });

    it('identifies all terminal statuses correctly', () => {
      const allStatuses: JobStatus[] = [
        'pending',
        'processing',
        'completed',
        'failed',
        'dead_letter',
        'cancelled',
      ];
      const terminal = allStatuses.filter(isTerminalStatus);
      expect(terminal).toEqual(['completed', 'failed', 'dead_letter', 'cancelled']);
    });
  });

  // ==========================================================================
  // canRetry
  // ==========================================================================
  describe('canRetry', () => {
    it('returns true when attempts < maxAttempts and status is non-terminal', () => {
      expect(canRetry({ attempts: 1, maxAttempts: 3, status: 'pending' })).toBe(true);
    });

    it('returns true when attempts < maxAttempts and status is processing', () => {
      expect(canRetry({ attempts: 0, maxAttempts: 3, status: 'processing' })).toBe(true);
    });

    it('returns false when attempts >= maxAttempts', () => {
      expect(canRetry({ attempts: 3, maxAttempts: 3, status: 'pending' })).toBe(false);
    });

    it('returns false when attempts exceed maxAttempts', () => {
      expect(canRetry({ attempts: 5, maxAttempts: 3, status: 'pending' })).toBe(false);
    });

    it('returns false when status is terminal even with retries remaining', () => {
      expect(canRetry({ attempts: 1, maxAttempts: 3, status: 'completed' })).toBe(false);
      expect(canRetry({ attempts: 1, maxAttempts: 3, status: 'failed' })).toBe(false);
      expect(canRetry({ attempts: 1, maxAttempts: 3, status: 'dead_letter' })).toBe(false);
    });

    it('returns false when both conditions fail', () => {
      expect(canRetry({ attempts: 3, maxAttempts: 3, status: 'dead_letter' })).toBe(false);
    });
  });

  // ==========================================================================
  // shouldProcess
  // ==========================================================================
  describe('shouldProcess', () => {
    it('returns true for pending job with scheduledAt in the past', () => {
      const past = new Date(Date.now() - 10_000);
      expect(shouldProcess({ status: 'pending', scheduledAt: past })).toBe(true);
    });

    it('returns true for pending job with scheduledAt equal to now', () => {
      const now = Date.now();
      const scheduledAt = new Date(now);
      expect(shouldProcess({ status: 'pending', scheduledAt }, now)).toBe(true);
    });

    it('returns false for pending job with scheduledAt in the future', () => {
      const now = Date.now();
      const future = new Date(now + 60_000);
      expect(shouldProcess({ status: 'pending', scheduledAt: future }, now)).toBe(false);
    });

    it('returns false for non-pending status even if scheduledAt has passed', () => {
      const past = new Date(Date.now() - 10_000);
      expect(shouldProcess({ status: 'processing', scheduledAt: past })).toBe(false);
      expect(shouldProcess({ status: 'completed', scheduledAt: past })).toBe(false);
      expect(shouldProcess({ status: 'failed', scheduledAt: past })).toBe(false);
      expect(shouldProcess({ status: 'dead_letter', scheduledAt: past })).toBe(false);
    });
  });

  // ==========================================================================
  // calculateBackoff
  // ==========================================================================
  describe('calculateBackoff', () => {
    it('returns baseDelayMs for first attempt', () => {
      expect(calculateBackoff(1, 1000)).toBe(1000);
    });

    it('doubles delay for each subsequent attempt', () => {
      expect(calculateBackoff(1, 1000)).toBe(1000);
      expect(calculateBackoff(2, 1000)).toBe(2000);
      expect(calculateBackoff(3, 1000)).toBe(4000);
      expect(calculateBackoff(4, 1000)).toBe(8000);
    });

    it('uses default base delay of 1000ms', () => {
      expect(calculateBackoff(1)).toBe(1000);
      expect(calculateBackoff(2)).toBe(2000);
      expect(calculateBackoff(3)).toBe(4000);
    });

    it('works with custom base delay', () => {
      expect(calculateBackoff(1, 500)).toBe(500);
      expect(calculateBackoff(2, 500)).toBe(1000);
      expect(calculateBackoff(3, 500)).toBe(2000);
    });

    it('throws RangeError for attempts < 1', () => {
      expect(() => calculateBackoff(0)).toThrow(RangeError);
      expect(() => calculateBackoff(-1)).toThrow(RangeError);
    });

    it('handles large attempt counts', () => {
      expect(calculateBackoff(10, 1000)).toBe(1000 * Math.pow(2, 9));
    });
  });
});
