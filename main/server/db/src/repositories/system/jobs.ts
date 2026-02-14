// main/server/db/src/repositories/system/jobs.ts
/**
 * Jobs Repository (Functional)
 *
 * Data access layer for the jobs table.
 * Manages background job queue records with priority and retry support.
 *
 * @module
 */

import { and, eq, rawCondition, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type Job,
  JOB_STATUSES,
  type NewJob,
  type UpdateJob,
  JOB_COLUMNS,
  JOBS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

/** Status value for pending jobs, sourced from schema constants */
const PENDING_STATUS = JOB_STATUSES[0]; // 'pending'

// ============================================================================
// Job Repository Interface
// ============================================================================

/**
 * Functional repository for background job operations
 */
export interface JobRepository {
  /**
   * Create a new job
   * @param data - The job data to insert
   * @returns The created job
   * @throws Error if insert fails
   */
  create(data: NewJob): Promise<Job>;

  /**
   * Find a job by its ID
   * @param id - The job ID
   * @returns The job or null if not found
   */
  findById(id: string): Promise<Job | null>;

  /**
   * Find a job by its idempotency key
   * @param key - The idempotency key
   * @returns The job or null if not found
   */
  findByIdempotencyKey(key: string): Promise<Job | null>;

  /**
   * Find jobs by status
   * @param status - The job status to filter by
   * @param limit - Maximum number of jobs (default: 100)
   * @returns Array of jobs, ordered by priority desc then scheduled_at asc
   */
  findByStatus(status: string, limit?: number): Promise<Job[]>;

  /**
   * Find pending jobs ready for processing (scheduled_at <= now)
   * @param limit - Maximum number of jobs (default: 10)
   * @returns Array of pending jobs, highest priority first
   */
  findPending(limit?: number): Promise<Job[]>;

  /**
   * Update a job's state
   * @param id - The job ID to update
   * @param data - The fields to update
   * @returns The updated job or null if not found
   */
  update(id: string, data: UpdateJob): Promise<Job | null>;

  /**
   * Delete a job by ID
   * @param id - The job ID to delete
   * @returns True if the job was deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Find jobs by type
   * @param type - The job type string
   * @param limit - Maximum number of jobs (default: 100)
   * @returns Array of matching jobs, most recent first
   */
  findByType(type: string, limit?: number): Promise<Job[]>;
}

// ============================================================================
// Job Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Job type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Job object
 * @complexity O(n) where n is number of columns
 */
function transformJob(row: Record<string, unknown>): Job {
  return toCamelCase<Job>(row, JOB_COLUMNS);
}

/**
 * Create a job repository bound to a database connection
 * @param db - The raw database client
 * @returns JobRepository implementation
 */
export function createJobRepository(db: RawDb): JobRepository {
  return {
    async create(data: NewJob): Promise<Job> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, JOB_COLUMNS);
      const result = await db.queryOne(insert(JOBS_TABLE).values(snakeData).returningAll().toSql());
      if (result === null) {
        throw new Error('Failed to create job');
      }
      return transformJob(result);
    },

    async findById(id: string): Promise<Job | null> {
      const result = await db.queryOne(select(JOBS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformJob(result) : null;
    },

    async findByIdempotencyKey(key: string): Promise<Job | null> {
      const result = await db.queryOne(
        select(JOBS_TABLE).where(eq('idempotency_key', key)).toSql(),
      );
      return result !== null ? transformJob(result) : null;
    },

    async findByStatus(status: string, limit = 100): Promise<Job[]> {
      const results = await db.query(
        select(JOBS_TABLE)
          .where(eq('status', status))
          .orderBy('priority', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformJob);
    },

    async findPending(limit = 10): Promise<Job[]> {
      const results = await db.query(
        select(JOBS_TABLE)
          .where(and(eq('status', PENDING_STATUS), rawCondition('"scheduled_at" <= NOW()')))
          .orderBy('priority', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformJob);
    },

    async update(id: string, data: UpdateJob): Promise<Job | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, JOB_COLUMNS);
      const result = await db.queryOne(
        update(JOBS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformJob(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(JOBS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async findByType(type: string, limit = 100): Promise<Job[]> {
      const results = await db.query(
        select(JOBS_TABLE)
          .where(eq('type', type))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformJob);
    },
  };
}
