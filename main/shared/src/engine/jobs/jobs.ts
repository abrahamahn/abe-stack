// main/shared/src/engine/jobs/jobs.ts
/**
 * Job Domain — schemas, types, and pure logic for background jobs.
 * @module Domain/Jobs
 */

import {
  coerceDate,
  createEnumSchema,
  createSchema,
  isoDateTimeSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseString,
  withDefault,
} from '../../primitives/schema';
import { jobIdSchema } from '../../primitives/schema/ids';
import { JOB_PRIORITIES, JOB_PRIORITY_VALUES, JOB_STATUSES } from '../constants/platform';

import type { Schema } from '../../primitives/schema';
import type { JobId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

/** Job status union type */
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Job priority union type */
export type JobPriority = (typeof JOB_PRIORITIES)[number];

/** Job error information */
export interface JobError {
  name: string;
  message: string;
  stack?: string | undefined;
}

/** Domain-level job representation with Date objects (used by logic functions) */
export interface DomainJob {
  id: string;
  name: string;
  args: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  createdAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  error: JobError | null;
  deadLetterReason?: string | null;
}

/** Full job details for monitoring (serialized with ISO string dates) */
export interface JobDetails {
  id: string;
  name: string;
  args: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: JobError | null;
  deadLetterReason?: string | null;
}

/** Input for listing jobs */
export interface JobListQuery {
  status?: JobStatus | undefined;
  name?: string | undefined;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'scheduledAt' | 'completedAt' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/** Paginated jobs list response */
export interface JobListResponse {
  data: JobDetails[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

/** Queue health statistics */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  failureRate: number;
  recentCompleted: number;
  recentFailed: number;
}

/** Request with job ID */
export interface JobIdRequest {
  jobId: string;
}

/** Simple success/failure response */
export interface JobActionResponse {
  success: boolean;
  message: string;
}

/**
 * Background job record (domain representation, mirrors DB SELECT).
 * Postgres-backed job queue with priority and retry support.
 */
export interface Job {
  id: JobId;
  type: string;
  payload: unknown;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  idempotencyKey: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

/** Fields for creating a new job (INSERT). */
export interface CreateJob {
  type: string;
  payload?: unknown;
  priority?: number | undefined;
  maxAttempts?: number | undefined;
  idempotencyKey?: string | null | undefined;
  scheduledAt?: Date | undefined;
}

/** Fields for updating an existing job (UPDATE). */
export interface UpdateJob {
  status?: JobStatus | undefined;
  attempts?: number | undefined;
  lastError?: string | null | undefined;
  scheduledAt?: Date | null | undefined;
  startedAt?: Date | null | undefined;
  completedAt?: Date | null | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/** Re-export platform constants for convenience */
export { JOB_PRIORITIES, JOB_PRIORITY_VALUES, JOB_STATUSES };

/** Set of statuses that represent a finished job */
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  'completed',
  'failed',
  'dead_letter',
  'cancelled',
]);

/** Display config mapping status to label and tone */
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

// ============================================================================
// Schemas
// ============================================================================

/** Enum schemas */
export const jobStatusSchema = createEnumSchema(JOB_STATUSES, 'job status');

export const jobErrorSchema: Schema<JobError> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    name: parseString(obj['name'], 'name'),
    message: parseString(obj['message'], 'message'),
    stack: parseOptional(obj['stack'], (v) => parseString(v, 'stack')),
  };
});

export const jobDetailsSchema: Schema<JobDetails> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    name: parseString(obj['name'], 'name'),
    args: obj['args'], // Dynamic args allowed
    status: jobStatusSchema.parse(obj['status']),
    attempts: parseNumber(obj['attempts'], 'attempts', { int: true, min: 0 }),
    maxAttempts: parseNumber(obj['maxAttempts'], 'maxAttempts', { int: true, min: 0 }),
    scheduledAt: isoDateTimeSchema.parse(obj['scheduledAt']),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    completedAt: parseNullable(obj['completedAt'], (v) => isoDateTimeSchema.parse(v)),
    durationMs: parseNullable(obj['durationMs'], (v) => parseNumber(v, 'durationMs')),
    error: parseNullable(obj['error'], (v) => jobErrorSchema.parse(v)),
    deadLetterReason: parseNullable(obj['deadLetterReason'], (v) =>
      parseString(v, 'deadLetterReason'),
    ),
  };
});

export const jobListQuerySchema: Schema<JobListQuery> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    status: parseOptional(obj['status'], (v) => jobStatusSchema.parse(v)),
    name: parseOptional(obj['name'], (v) => parseString(v, 'name')),
    page: parseNumber(withDefault(obj['page'], 1), 'page', { int: true, min: 1 }),
    limit: parseNumber(withDefault(obj['limit'], 50), 'limit', { int: true, min: 1, max: 100 }),
    sortBy: parseOptional(obj['sortBy'], (v) => {
      if (v !== 'createdAt' && v !== 'scheduledAt' && v !== 'completedAt') {
        throw new Error('Invalid sortBy field');
      }
      return v;
    }),
    sortOrder: parseOptional(obj['sortOrder'], (v) => {
      if (v !== 'asc' && v !== 'desc') throw new Error('Invalid sortOrder');
      return v;
    }),
  };
});

export const jobListResponseSchema: Schema<JobListResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (!Array.isArray(obj['data'])) throw new Error('data must be an array');
  return {
    data: obj['data'].map((item) => jobDetailsSchema.parse(item)),
    total: parseNumber(obj['total'], 'total', { int: true, min: 0 }),
    page: parseNumber(obj['page'], 'page', { int: true, min: 1 }),
    limit: parseNumber(obj['limit'], 'limit', { int: true, min: 1 }),
    hasNext: parseBoolean(obj['hasNext'], 'hasNext'),
    hasPrev: parseBoolean(obj['hasPrev'], 'hasPrev'),
    totalPages: parseNumber(obj['totalPages'], 'totalPages', { int: true, min: 0 }),
  };
});

export const queueStatsSchema: Schema<QueueStats> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    pending: parseNumber(obj['pending'], 'pending', { int: true, min: 0 }),
    processing: parseNumber(obj['processing'], 'processing', { int: true, min: 0 }),
    completed: parseNumber(obj['completed'], 'completed', { int: true, min: 0 }),
    failed: parseNumber(obj['failed'], 'failed', { int: true, min: 0 }),
    deadLetter: parseNumber(obj['deadLetter'], 'deadLetter', { int: true, min: 0 }),
    total: parseNumber(obj['total'], 'total', { int: true, min: 0 }),
    failureRate: parseNumber(obj['failureRate'], 'failureRate', { min: 0 }),
    recentCompleted: parseNumber(obj['recentCompleted'], 'recentCompleted', { int: true, min: 0 }),
    recentFailed: parseNumber(obj['recentFailed'], 'recentFailed', { int: true, min: 0 }),
  };
});

export const jobIdRequestSchema: Schema<JobIdRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { jobId: parseString(obj['jobId'], 'jobId', { min: 1 }) };
});

export const jobActionResponseSchema: Schema<JobActionResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    success: parseBoolean(obj['success'], 'success'),
    message: parseString(obj['message'], 'message'),
  };
});

/** Full job schema (validates DB SELECT result with Date coercion). */
export const jobSchema: Schema<Job> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: jobIdSchema.parse(obj['id']),
    type: parseString(obj['type'], 'type', { min: 1 }),
    payload: obj['payload'],
    status: jobStatusSchema.parse(obj['status']),
    priority: parseNumber(obj['priority'], 'priority', { int: true, min: -100, max: 100 }),
    attempts: parseNumber(obj['attempts'], 'attempts', { int: true, min: 0 }),
    maxAttempts: parseNumber(obj['maxAttempts'], 'maxAttempts', { int: true, min: 1 }),
    lastError: parseNullable(obj['lastError'], (v) => parseString(v, 'lastError')),
    idempotencyKey: parseNullable(obj['idempotencyKey'], (v) => parseString(v, 'idempotencyKey')),
    scheduledAt: coerceDate(obj['scheduledAt'], 'scheduledAt'),
    startedAt: parseNullable(obj['startedAt'], (v) => coerceDate(v, 'startedAt')),
    completedAt: parseNullable(obj['completedAt'], (v) => coerceDate(v, 'completedAt')),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/** Schema for creating a new job (INSERT input). */
export const createJobSchema: Schema<CreateJob> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    type: parseString(obj['type'], 'type', { min: 1 }),
    payload: obj['payload'],
    priority: parseOptional(obj['priority'], (v) =>
      parseNumber(v, 'priority', { int: true, min: -100, max: 100 }),
    ),
    maxAttempts: parseOptional(obj['maxAttempts'], (v) =>
      parseNumber(v, 'maxAttempts', { int: true, min: 1 }),
    ),
    idempotencyKey: parseNullableOptional(obj['idempotencyKey'], (v) =>
      parseString(v, 'idempotencyKey'),
    ),
    scheduledAt: parseOptional(obj['scheduledAt'], (v) => coerceDate(v, 'scheduledAt')),
  };
});

/** Schema for updating an existing job (partial UPDATE input). */
export const updateJobSchema: Schema<UpdateJob> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    status: parseOptional(obj['status'], (v) => jobStatusSchema.parse(v)),
    attempts: parseOptional(obj['attempts'], (v) =>
      parseNumber(v, 'attempts', { int: true, min: 0 }),
    ),
    lastError: parseNullableOptional(obj['lastError'], (v) => parseString(v, 'lastError')),
    scheduledAt: parseNullableOptional(obj['scheduledAt'], (v) => coerceDate(v, 'scheduledAt')),
    startedAt: parseNullableOptional(obj['startedAt'], (v) => coerceDate(v, 'startedAt')),
    completedAt: parseNullableOptional(obj['completedAt'], (v) => coerceDate(v, 'completedAt')),
  };
});

// ============================================================================
// Functions
// ============================================================================

/**
 * Checks whether a job status is terminal (no further processing).
 * Returns `true` if `completed`, `failed`, `dead_letter`, or `cancelled`.
 */
export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Determines whether a job can be retried.
 * A job is retryable when it has not reached its maximum attempts
 * and is not in a terminal state.
 */
export function canRetry(job: Pick<DomainJob, 'attempts' | 'maxAttempts' | 'status'>): boolean {
  return job.attempts < job.maxAttempts && !isTerminalStatus(job.status);
}

/**
 * Determines whether a job should be processed now.
 * A job is processable when it is pending and its scheduled time has passed.
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
 * @throws {RangeError} If attempts < 1
 */
export function calculateBackoff(attempts: number, baseDelayMs: number = 1000): number {
  if (attempts < 1) {
    throw new RangeError('attempts must be >= 1');
  }
  return baseDelayMs * Math.pow(2, attempts - 1);
}

/** Get a human-readable label for a job status. */
export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_CONFIG[status].label;
}

/** Get the badge tone for a job status. */
export function getJobStatusTone(status: JobStatus): 'info' | 'success' | 'warning' | 'danger' {
  return JOB_STATUS_CONFIG[status].tone;
}
