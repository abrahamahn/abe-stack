// src/server/core/src/scheduled-tasks/types.ts
/**
 * Scheduled Task Types
 *
 * Type definitions for the scheduled task system that runs cleanup
 * and maintenance jobs on regular intervals.
 *
 * @module
 */

/**
 * Task schedule configuration
 */
export type TaskSchedule = 'daily' | 'weekly';

/**
 * Scheduled task definition
 */
export interface ScheduledTask {
  /** Unique task identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Schedule frequency */
  schedule: TaskSchedule;
  /** Function to execute */
  execute: () => Promise<number>;
}

/**
 * Internal task tracker with interval ID
 */
export interface TaskTracker {
  task: ScheduledTask;
  intervalId: NodeJS.Timeout;
}

/**
 * Logger interface for scheduled tasks
 */
export interface ScheduledTaskLogger {
  info(data: Record<string, unknown>, msg: string): void;
  error(data: unknown, msg?: string): void;
}
