// main/shared/src/domain/jobs/jobs.display.ts

import type { JobStatus } from './jobs.schemas';

// ============================================================================
// Job Status Display
// ============================================================================

const JOB_STATUS_CONFIG: Record<
  JobStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }
> = {
  pending: { label: 'Pending', tone: 'info' },
  processing: { label: 'Processing', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  dead_letter: { label: 'Dead Letter', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'warning' },
};

/**
 * Get a human-readable label for a job status.
 */
export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_CONFIG[status].label;
}

/**
 * Get the badge tone for a job status.
 */
export function getJobStatusTone(status: JobStatus): 'info' | 'success' | 'warning' | 'danger' {
  return JOB_STATUS_CONFIG[status].tone;
}
