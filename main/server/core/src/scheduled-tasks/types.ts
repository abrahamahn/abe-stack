// main/server/core/src/scheduled-tasks/types.ts
/**
 * Scheduled Task Types
 *
 * Type definitions for the scheduled task system that runs cleanup
 * and maintenance jobs on regular intervals.
 *
 * @module
 */

import type { Logger } from '@abe-stack/shared';

/**
 * Task schedule configuration
 */
export type TaskSchedule = 'hourly' | 'daily' | 'weekly';

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

/** Backward-compatible logger alias for scheduled-tasks internals/tests. */
export type ScheduledTaskLogger = Logger;
