// main/shared/src/engine/jobs/jobs.display.test.ts

import { describe, expect, it } from 'vitest';

import { getJobStatusLabel, getJobStatusTone } from './jobs.display';
import { JOB_STATUSES } from './jobs.schemas';

import type { JobStatus } from './jobs.schemas';

describe('jobs.display', () => {
  describe('getJobStatusLabel', () => {
    const expectedLabels: Record<JobStatus, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      dead_letter: 'Dead Letter',
      cancelled: 'Cancelled',
    };

    it('returns a label for every job status', () => {
      for (const status of JOB_STATUSES) {
        expect(getJobStatusLabel(status)).toBe(expectedLabels[status]);
      }
    });
  });

  describe('getJobStatusTone', () => {
    const expectedTones: Record<JobStatus, string> = {
      pending: 'info',
      processing: 'warning',
      completed: 'success',
      failed: 'danger',
      dead_letter: 'danger',
      cancelled: 'warning',
    };

    it('returns a tone for every job status', () => {
      for (const status of JOB_STATUSES) {
        expect(getJobStatusTone(status)).toBe(expectedTones[status]);
      }
    });
  });
});
