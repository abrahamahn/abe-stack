// apps/server/src/infra/queue/postgresStore.ts
/**
 * PostgreSQL Queue Store
 *
 * Persistent queue storage using PostgreSQL.
 * Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent dequeue.
 */

import { sql } from 'drizzle-orm';

import type { QueueStore, Task, TaskError, TaskResult } from './types';
import type { DbClient } from '@database';

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
    await this.db.execute(sql`
      INSERT INTO job_queue (id, name, args, scheduled_at, attempts, max_attempts, created_at, status)
      VALUES (
        ${task.id},
        ${task.name},
        ${JSON.stringify(task.args)}::jsonb,
        ${task.scheduledAt}::timestamptz,
        ${task.attempts},
        ${task.maxAttempts},
        ${task.createdAt}::timestamptz,
        'pending'
      )
    `);
  }

  async dequeue(now: string): Promise<Task | null> {
    // Use FOR UPDATE SKIP LOCKED to safely dequeue in concurrent environments
    const result = (await this.db.execute(sql`
      UPDATE job_queue
      SET status = 'processing', attempts = attempts + 1
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending' AND scheduled_at <= ${now}::timestamptz
        ORDER BY scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, name, args, scheduled_at, attempts, max_attempts, created_at
    `)) as unknown as {
      rows: Array<{
        id: string;
        name: string;
        args: unknown;
        scheduled_at: string;
        attempts: number;
        max_attempts: number;
        created_at: string;
      }>;
    };

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (!row) return null;

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
    await this.db.execute(sql`
      UPDATE job_queue
      SET
        status = 'completed',
        completed_at = ${result.completedAt}::timestamptz,
        duration_ms = ${result.durationMs}
      WHERE id = ${taskId}
    `);
  }

  async fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void> {
    if (nextAttemptAt) {
      // Retry: reset to pending with new scheduled time
      await this.db.execute(sql`
        UPDATE job_queue
        SET
          status = 'pending',
          scheduled_at = ${nextAttemptAt}::timestamptz,
          error = ${JSON.stringify(error)}::jsonb
        WHERE id = ${taskId}
      `);
    } else {
      // Final failure
      await this.db.execute(sql`
        UPDATE job_queue
        SET
          status = 'failed',
          error = ${JSON.stringify(error)}::jsonb,
          completed_at = NOW()
        WHERE id = ${taskId}
      `);
    }
  }

  async get(taskId: string): Promise<Task | null> {
    const result = (await this.db.execute(sql`
      SELECT id, name, args, scheduled_at, attempts, max_attempts, created_at
      FROM job_queue
      WHERE id = ${taskId}
    `)) as unknown as {
      rows: Array<{
        id: string;
        name: string;
        args: unknown;
        scheduled_at: string;
        attempts: number;
        max_attempts: number;
        created_at: string;
      }>;
    };

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (!row) return null;

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
    const result = (await this.db.execute(sql`
      SELECT COUNT(*) as count FROM job_queue WHERE status = 'pending'
    `)) as unknown as { rows: Array<{ count: string }> };
    const row = result.rows[0];
    return row ? parseInt(row.count, 10) : 0;
  }

  async getFailedCount(): Promise<number> {
    const result = (await this.db.execute(sql`
      SELECT COUNT(*) as count FROM job_queue WHERE status = 'failed'
    `)) as unknown as { rows: Array<{ count: string }> };
    const row = result.rows[0];
    return row ? parseInt(row.count, 10) : 0;
  }

  async clearCompleted(before: string): Promise<number> {
    const result = (await this.db.execute(sql`
      DELETE FROM job_queue
      WHERE status = 'completed' AND completed_at < ${before}::timestamptz
    `)) as unknown as { rowCount: number | null };
    return result.rowCount ?? 0;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPostgresQueueStore(db: DbClient): PostgresQueueStore {
  return new PostgresQueueStore(db);
}
