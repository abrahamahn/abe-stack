// apps/server/src/modules/admin/jobsService.ts
/**
 * Jobs Service
 *
 * Pure business logic for job monitoring operations.
 * Includes payload redaction for sensitive fields.
 */

import type {
    JobDetails,
    JobListOptions,
    JobListResult,
    PostgresQueueStore,
    QueueStats,
} from '@infrastructure';

// ============================================================================
// Sensitive Field Redaction
// ============================================================================

/** Fields that should be redacted from job payloads */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
  'apikey',
  'api_key',
  'apiKey',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'private',
  'privateKey',
  'private_key',
  'jwt',
  'bearer',
  'authorization',
] as const;

/** Placeholder for redacted values */
const REDACTED = '[REDACTED]';

/**
 * Check if a key name contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));
}

/**
 * Recursively redact sensitive fields from an object
 */
export function redactSensitiveFields(data: unknown, maxDepth: number = 10): unknown {
  if (maxDepth <= 0) return data;

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveFields(item, maxDepth - 1));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSensitiveFields(value, maxDepth - 1);
      }
    }
    return result;
  }

  return data;
}

/**
 * Redact sensitive fields from a job's args
 */
function redactJobArgs(job: JobDetails): JobDetails {
  return {
    ...job,
    args: redactSensitiveFields(job.args),
  };
}

// ============================================================================
// Custom Errors
// ============================================================================

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

export class QueueStoreNotAvailableError extends Error {
  constructor(method: string) {
    super(`Queue store does not support method: ${method}`);
    this.name = 'QueueStoreNotAvailableError';
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List jobs with filtering, pagination, and payload redaction
 */
export async function listJobs(
  store: PostgresQueueStore,
  options: JobListOptions,
): Promise<JobListResult> {
  const result = await store.listJobs(options);

  // Redact sensitive fields from all job payloads
  return {
    ...result,
    data: result.data.map(redactJobArgs),
  };
}

/**
 * Get detailed job information with payload redaction
 */
export async function getJobDetails(store: PostgresQueueStore, jobId: string): Promise<JobDetails> {
  const job = await store.getJobDetails(jobId);
  if (job === null) {
    throw new JobNotFoundError(jobId);
  }

  return redactJobArgs(job);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(store: PostgresQueueStore): Promise<QueueStats> {
  return store.getQueueStats();
}

/**
 * Retry a failed job
 */
export async function retryJob(
  store: PostgresQueueStore,
  jobId: string,
): Promise<{ success: boolean; message: string }> {
  const success = await store.retryJob(jobId);

  if (!success) {
    // Job either doesn't exist or is not in a retriable state

    const job = await store.getJobDetails(jobId);
    if (job === null) {
      throw new JobNotFoundError(jobId);
    }
    return {
      success: false,
      message: `Job cannot be retried. Current status: ${job.status}`,
    };
  }

  return {
    success: true,
    message: 'Job has been queued for retry',
  };
}

/**
 * Cancel a pending or processing job
 */
export async function cancelJob(
  store: PostgresQueueStore,
  jobId: string,
): Promise<{ success: boolean; message: string }> {
  const success = await store.cancelJob(jobId);

  if (!success) {
    // Job either doesn't exist or is not in a cancellable state

    const job = await store.getJobDetails(jobId);
    if (job === null) {
      throw new JobNotFoundError(jobId);
    }
    return {
      success: false,
      message: `Job cannot be cancelled. Current status: ${job.status}`,
    };
  }

  return {
    success: true,
    message: 'Job has been cancelled',
  };
}
