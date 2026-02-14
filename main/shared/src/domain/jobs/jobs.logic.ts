// main/shared/src/domain/jobs/jobs.logic.ts

/**
 * @file Job Domain Logic
 * @description Pure functions for background job state evaluation and retry logic.
 * @module Domain/Jobs
 */

import type { DomainJob, JobStatus } from './jobs.schemas';

// ============================================================================
// Terminal Status Check
// ============================================================================

/** Set of statuses that represent a finished job */
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
]);

/**
 * Checks whether a job status is terminal (no further processing).
 *
 * @param status - The job status to evaluate
 * @returns `true` if `completed`, `failed`, `dead_letter`, or `cancelled`
 * @complexity O(1) — Set lookup
 */
export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Determines whether a job can be retried.
 * A job is retryable when it has not reached its maximum attempts
 * and is not in a terminal state.
 *
 * @param job - The job to evaluate
 * @returns `true` if the job can be retried
 * @complexity O(1)
 */
export function canRetry(job: Pick<DomainJob, 'attempts' | 'maxAttempts' | 'status'>): boolean {
  return job.attempts < job.maxAttempts && !isTerminalStatus(job.status);
}

/**
 * Determines whether a job should be processed now.
 * A job is processable when it is pending and its scheduled time has passed.
 *
 * @param job - The job to evaluate
 * @param now - Reference time (defaults to `Date.now()`)
 * @returns `true` if the job should be picked up
 * @complexity O(1)
 */
export function shouldProcess(
  job: Pick<DomainJob, 'status' | 'scheduledAt'>,
  now: number = Date.now(),
): boolean {
  return job.status === 'pending' && job.scheduledAt.getTime() <= now;
}

/**
 * Calculates exponential backoff delay for retry scheduling.
 * Uses the formula: `baseDelayMs * 2^(attempts - 1)`.
 *
 * @param attempts - Number of attempts completed (must be >= 1)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Delay in milliseconds before next retry
 * @throws {RangeError} If attempts < 1
 * @complexity O(1)
 */
export function calculateBackoff(attempts: number, baseDelayMs: number = 1000): number {
  if (attempts < 1) {
    throw new RangeError('attempts must be >= 1');
  }
  return baseDelayMs * Math.pow(2, attempts - 1);
}
