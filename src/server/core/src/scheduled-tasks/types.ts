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
 * Logger interface for scheduled tasks.
 * Must be compatible with UsersLogger (extends shared Logger contract).
 */
export interface ScheduledTaskLogger {
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>, msg: string): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  error(data: unknown, msg?: string): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): ScheduledTaskLogger;
}
