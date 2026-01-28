// apps/server/src/infrastructure/jobs/queue/postgresStore.ts
/**
 * PostgreSQL Queue Store
 *
 * Persistent queue storage using PostgreSQL.
 * Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent dequeue.
 */

import type {
    JobDetails,
    JobListOptions,
    JobListResult,
    JobStatus,
    QueueStats,
    QueueStore,
    Task,
    TaskError,
    TaskResult,
} from './types';
import type { DbClient } from '@data/database';

// ============================================================================
// SQL Result Types
// ============================================================================

/** Row shape for task queries */
type TaskRow = Record<string, unknown> & {
  id: string;
  name: string;
  args: unknown;
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
};

/** Extended row shape for detailed job queries */
type JobDetailsRow = TaskRow & {
  status: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  dead_letter_reason?: string | null;
};

/** Row shape for count queries */
type CountRow = Record<string, unknown> & {
  count: string;
};

// ============================================================================
// Schema (run this migration manually or via Drizzle)
// ============================================================================

/**
 * SQL to create the queue table:
 *
 * CREATE TABLE IF NOT EXISTS job_queue (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   args JSONB NOT NULL DEFAULT '{}',
 *   scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   attempts INTEGER NOT NULL DEFAULT 0,
 *   max_attempts INTEGER NOT NULL DEFAULT 3,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   status TEXT NOT NULL DEFAULT 'pending',
 *   error JSONB,
 *   completed_at TIMESTAMPTZ,
 *   duration_ms INTEGER
 * );
 *
 * CREATE INDEX idx_job_queue_status_scheduled ON job_queue(status, scheduled_at)
 *   WHERE status = 'pending';
 */

// ============================================================================
// PostgreSQL Queue Store
// ============================================================================

export class PostgresQueueStore implements QueueStore {
  constructor(private db: DbClient) {}

  async enqueue(task: Task): Promise<void> {
    await this.db.execute({
      text: `INSERT INTO job_queue (id, name, args, scheduled_at, attempts, max_attempts, created_at, status)
        VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5, $6, $7::timestamptz, 'pending')`,
      values: [
        task.id,
        task.name,
        JSON.stringify(task.args),
        task.scheduledAt,
        task.attempts,
        task.maxAttempts,
        task.createdAt,
      ],
    });
  }

  async dequeue(now: string): Promise<Task | null> {
    // Use FOR UPDATE SKIP LOCKED to safely dequeue in concurrent environments
    const rows = await this.db.raw<TaskRow>(
      `UPDATE job_queue
      SET status = 'processing', attempts = attempts + 1
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending' AND scheduled_at <= $1::timestamptz
        ORDER BY scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, name, args, scheduled_at, attempts, max_attempts, created_at`,
      [now],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    if (row === undefined) return null;

    return {
      id: row.id,
      name: row.name,
      args: row.args,
      scheduledAt: row.scheduled_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
    };
  }

  async complete(taskId: string, result: TaskResult): Promise<void> {
    await this.db.execute({
      text: `UPDATE job_queue
        SET status = 'completed', completed_at = $1::timestamptz, duration_ms = $2
        WHERE id = $3`,
      values: [result.completedAt, result.durationMs, taskId],
    });
  }

  async fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void> {
    if (nextAttemptAt !== undefined && nextAttemptAt !== '') {
      // Retry: reset to pending with new scheduled time
      await this.db.execute({
        text: `UPDATE job_queue
          SET status = 'pending', scheduled_at = $1::timestamptz, error = $2::jsonb
          WHERE id = $3`,
        values: [nextAttemptAt, JSON.stringify(error), taskId],
      });
    } else {
      // Final failure
      await this.db.execute({
        text: `UPDATE job_queue
          SET status = 'failed', error = $1::jsonb, completed_at = NOW()
          WHERE id = $2`,
        values: [JSON.stringify(error), taskId],
      });
    }
  }

  async get(taskId: string): Promise<Task | null> {
    const rows = await this.db.raw<TaskRow>(
      `SELECT id, name, args, scheduled_at, attempts, max_attempts, created_at
      FROM job_queue
      WHERE id = $1`,
      [taskId],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    if (row === undefined) return null;

    return {
      id: row.id,
      name: row.name,
      args: row.args,
      scheduledAt: row.scheduled_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
    };
  }

  async getPendingCount(): Promise<number> {
    const rows = await this.db.raw<CountRow>(
      `SELECT COUNT(*) as count FROM job_queue WHERE status = 'pending'`,
    );
    const row = rows[0];
    return row !== undefined ? parseInt(row.count, 10) : 0;
  }

  async getFailedCount(): Promise<number> {
    const rows = await this.db.raw<CountRow>(
      `SELECT COUNT(*) as count FROM job_queue WHERE status = 'failed'`,
    );
    const row = rows[0];
    return row !== undefined ? parseInt(row.count, 10) : 0;
  }

  async clearCompleted(before: string): Promise<number> {
    return await this.db.execute({
      text: `DELETE FROM job_queue
        WHERE status = 'completed' AND completed_at < $1::timestamptz`,
      values: [before],
    });
  }

  // ===========================================================================
  // Monitoring Methods
  // ===========================================================================

  async listJobs(options: JobListOptions): Promise<JobListResult> {
    const { status, name, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      conditions.push(`status = $${String(paramIndex)}`);
      values.push(status);
      paramIndex++;
    }

    if (name !== undefined && name !== '') {
      conditions.push(`name ILIKE $${String(paramIndex)}`);
      values.push(`%${name}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Map sortBy to column names
    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      scheduledAt: 'scheduled_at',
      completedAt: 'completed_at',
    };
    const sortColumn = columnMap[sortBy] ?? 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM job_queue ${whereClause}`;
    const countRows = await this.db.raw<CountRow>(countQuery, values);
    const total = countRows[0] !== undefined ? parseInt(countRows[0].count, 10) : 0;

    // Get paginated data
    const dataQuery = `
      SELECT id, name, args, status, attempts, max_attempts, scheduled_at, created_at,
             completed_at, duration_ms, error, dead_letter_reason
      FROM job_queue
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${String(paramIndex)} OFFSET $${String(paramIndex + 1)}
    `;

    const rows = await this.db.raw<JobDetailsRow>(dataQuery, [...values, limit, offset]);

    const data: JobDetails[] = rows.map((row) => this.mapRowToJobDetails(row));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      totalPages,
    };
  }

  async getJobDetails(taskId: string): Promise<JobDetails | null> {
    const rows = await this.db.raw<JobDetailsRow>(
      `SELECT id, name, args, status, attempts, max_attempts, scheduled_at, created_at,
              completed_at, duration_ms, error, dead_letter_reason
       FROM job_queue
       WHERE id = $1`,
      [taskId],
    );

    if (rows.length === 0 || rows[0] === undefined) return null;
    return this.mapRowToJobDetails(rows[0]);
  }

  async getQueueStats(): Promise<QueueStats> {
    // Get counts by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM job_queue
      GROUP BY status
    `;
    const statusRows = await this.db.raw<{ status: string; count: string }>(statusQuery, []);

    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let deadLetter = 0;
    let cancelled = 0;

    for (const row of statusRows) {
      const count = parseInt(row.count, 10);
      switch (row.status) {
        case 'pending':
          pending = count;
          break;
        case 'processing':
          processing = count;
          break;
        case 'completed':
          completed = count;
          break;
        case 'failed':
          failed = count;
          break;
        case 'dead_letter':
          deadLetter = count;
          break;
        case 'cancelled':
          cancelled = count;
          break;
      }
    }

    // Get recent stats (last hour)
    const recentQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour') as recent_completed,
        COUNT(*) FILTER (WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '1 hour') as recent_failed
      FROM job_queue
    `;
    const recentRows = await this.db.raw<{ recent_completed: string; recent_failed: string }>(
      recentQuery,
      [],
    );

    const recentCompleted = recentRows[0] !== undefined ? parseInt(recentRows[0].recent_completed, 10) : 0;
    const recentFailed = recentRows[0] !== undefined ? parseInt(recentRows[0].recent_failed, 10) : 0;

    const total = pending + processing + completed + failed + deadLetter + cancelled;
    const completedTotal = completed + failed;
    const failureRate = completedTotal > 0 ? (failed / completedTotal) * 100 : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      deadLetter,
      total,
      failureRate: Math.round(failureRate * 100) / 100,
      recentCompleted,
      recentFailed,
    };
  }

  async retryJob(taskId: string): Promise<boolean> {
    // Only retry failed jobs
    const result = await this.db.execute({
      text: `UPDATE job_queue
        SET status = 'pending', attempts = 0, error = NULL, completed_at = NULL, scheduled_at = NOW()
        WHERE id = $1 AND status IN ('failed', 'dead_letter')`,
      values: [taskId],
    });
    return result > 0;
  }

  async cancelJob(taskId: string): Promise<boolean> {
    // Only cancel pending or processing jobs
    const result = await this.db.execute({
      text: `UPDATE job_queue
        SET status = 'cancelled', completed_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'processing')`,
      values: [taskId],
    });
    return result > 0;
  }

  async moveToDeadLetter(taskId: string, reason: string): Promise<boolean> {
    const result = await this.db.execute({
      text: `UPDATE job_queue
        SET status = 'dead_letter', dead_letter_reason = $2, completed_at = NOW()
        WHERE id = $1 AND status = 'failed'`,
      values: [taskId, reason],
    });
    return result > 0;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private mapRowToJobDetails(row: JobDetailsRow): JobDetails {
    let parsedError: TaskError | null = null;
    if (row.error !== null && row.error !== '') {
      try {
        parsedError = JSON.parse(row.error) as TaskError;
      } catch {
        parsedError = { name: 'UnknownError', message: row.error };
      }
    }

    return {
      id: row.id,
      name: row.name,
      args: row.args,
      status: row.status as JobStatus,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      error: parsedError,
      deadLetterReason: row.dead_letter_reason ?? null,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPostgresQueueStore(db: DbClient): PostgresQueueStore {
  return new PostgresQueueStore(db);
}
