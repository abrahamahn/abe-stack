// main/shared/src/engine/jobs/jobs.schemas.ts
/**
 * Job Domain Schemas
 *
 * Schemas for background job validation and type inference.
 * @module Domain/Jobs
 */

import { jobIdSchema } from '../../core/ids';
import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseString,
  withDefault,
} from '../../primitives/schema';
import { isoDateTimeSchema } from '../../core/schemas';
import { JOB_PRIORITIES, JOB_STATUSES } from '../constants/platform';

import type { JobId } from '../../core/ids';
import type { Schema } from '../../primitives/schema';


// ============================================================================
// Constants
// ============================================================================

/** Job status union type */
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Job priority union type */
export type JobPriority = (typeof JOB_PRIORITIES)[number];

/** Enum schemas */
export const jobStatusSchema = createEnumSchema(JOB_STATUSES, 'job status');

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Schemas
// ============================================================================

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

// ============================================================================
// DB-Aligned Job Types (mirrors main/server/db/src/schema/system.ts)
// ============================================================================

/**
 * Background job record (domain representation, mirrors DB SELECT).
 * Postgres-backed job queue with priority and retry support.
 *
 * @param id - Job UUID
 * @param type - Job type identifier (e.g. "email:send")
 * @param payload - Arbitrary JSON payload
 * @param status - Current lifecycle status
 * @param priority - Queue priority [-100, 100]
 * @param attempts - Number of processing attempts
 * @param maxAttempts - Maximum retry count (>= 1)
 * @param lastError - Error message from last failed attempt
 * @param idempotencyKey - Optional deduplication key
 * @param scheduledAt - Earliest processing time
 * @param startedAt - When processing began
 * @param completedAt - When processing finished
 * @param createdAt - Row creation timestamp
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

/**
 * Fields for creating a new job (INSERT).
 *
 * @param type - Required job type identifier
 * @param payload - Optional JSON payload
 * @param priority - Optional queue priority [-100, 100] (int)
 * @param maxAttempts - Optional max retries (int >= 1)
 * @param idempotencyKey - Optional deduplication key
 * @param scheduledAt - Optional deferred start time
 */
export interface CreateJob {
  type: string;
  payload?: unknown;
  priority?: number | undefined;
  maxAttempts?: number | undefined;
  idempotencyKey?: string | null | undefined;
  scheduledAt?: Date | undefined;
}

/**
 * Fields for updating an existing job (UPDATE).
 * Primarily used by the queue processor to advance state.
 *
 * @param status - New lifecycle status
 * @param attempts - Updated attempt count
 * @param lastError - Error message (nullable)
 * @param scheduledAt - Rescheduled time (nullable)
 * @param startedAt - Processing start time (nullable)
 * @param completedAt - Completion time (nullable)
 */
export interface UpdateJob {
  status?: JobStatus | undefined;
  attempts?: number | undefined;
  lastError?: string | null | undefined;
  scheduledAt?: Date | null | undefined;
  startedAt?: Date | null | undefined;
  completedAt?: Date | null | undefined;
}

// ============================================================================
// DB-Aligned Job Schemas
// ============================================================================

/**
 * Full job schema (validates DB SELECT result with Date coercion).
 * @complexity O(1)
 */
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

/**
 * Schema for creating a new job (INSERT input).
 * Only `type` is required; all other fields are optional.
 * @complexity O(1)
 */
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

/**
 * Schema for updating an existing job (partial UPDATE input).
 * All fields are optional; nullable fields accept null to clear values.
 * @complexity O(1)
 */
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
