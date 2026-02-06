// packages/shared/src/domain/jobs/jobs.schemas.ts

/**
 * @file Job Domain Schemas
 * @description Schemas for background job validation and type inference.
 * @module Domain/Jobs
 */

import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseRecord,
  parseString,
} from '../../contracts/schema';
import { jobIdSchema } from '../../types/ids';

import type { Schema } from '../../contracts/types';
import type { JobId } from '../../types/ids';

// ============================================================================
// Constants
// ============================================================================

/** All valid job statuses in lifecycle order */
export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed', 'dead'] as const;

/** Job status union type */
export type JobStatus = (typeof JOB_STATUSES)[number];

/** All valid job priority levels (higher = sooner) */
export const JOB_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

/** Job priority union type */
export type JobPriority = (typeof JOB_PRIORITIES)[number];

/** Numeric priority mapping for queue ordering */
export const JOB_PRIORITY_VALUES: Readonly<Record<JobPriority, number>> = {
  low: -10,
  normal: 0,
  high: 10,
  critical: 100,
} as const;

/** Enum schemas */
const jobStatusSchema = createEnumSchema(JOB_STATUSES, 'job status');

// ============================================================================
// Types
// ============================================================================

/** Full job entity (matches DB SELECT result) */
export interface DomainJob {
  id: JobId;
  type: string;
  payload: Record<string, unknown>;
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

/** Input for creating a new job */
export interface CreateJob {
  type: string;
  payload?: Record<string, unknown> | undefined;
  priority?: number | undefined;
  maxAttempts?: number | undefined;
  idempotencyKey?: string | null | undefined;
  scheduledAt?: Date | undefined;
}

/** Input for updating an existing job */
export interface UpdateJob {
  status?: JobStatus | undefined;
  attempts?: number | undefined;
  lastError?: string | null | undefined;
  scheduledAt?: Date | undefined;
  startedAt?: Date | null | undefined;
  completedAt?: Date | null | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Full job schema (matches DB SELECT result).
 */
export const jobSchema: Schema<DomainJob> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: jobIdSchema.parse(obj['id']),
    type: parseString(obj['type'], 'type', { min: 1 }),
    payload: parseRecord(obj['payload'], 'payload'),
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
 * Schema for creating a new job.
 */
export const createJobSchema: Schema<CreateJob> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    type: parseString(obj['type'], 'type', { min: 1 }),
    payload: parseOptional(obj['payload'], (v) => parseRecord(v, 'payload')),
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
 * Schema for updating an existing job.
 */
export const updateJobSchema: Schema<UpdateJob> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    status: parseOptional(obj['status'], (v) => jobStatusSchema.parse(v)),
    attempts: parseOptional(obj['attempts'], (v) =>
      parseNumber(v, 'attempts', { int: true, min: 0 }),
    ),
    lastError: parseNullableOptional(obj['lastError'], (v) => parseString(v, 'lastError')),
    scheduledAt: parseOptional(obj['scheduledAt'], (v) => coerceDate(v, 'scheduledAt')),
    startedAt: parseNullableOptional(obj['startedAt'], (v) => coerceDate(v, 'startedAt')),
    completedAt: parseNullableOptional(obj['completedAt'], (v) => coerceDate(v, 'completedAt')),
  };
});
