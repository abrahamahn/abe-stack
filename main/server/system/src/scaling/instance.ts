// main/server/system/src/scaling/instance.ts
/**
 * Instance Identity & Metadata
 *
 * Generates a unique instance ID on startup and exposes metadata
 * for correlation, logging, and distributed coordination.
 *
 * Each process gets a stable ID that persists for the lifetime of the process.
 * The ID combines a timestamp component and a random component for both
 * uniqueness and rough temporal ordering.
 *
 * @module @bslt/server-system/scaling
 */

import { randomBytes } from 'crypto';
import { hostname } from 'os';

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata about the running instance.
 */
export interface InstanceMetadata {
  /** Unique instance identifier */
  instanceId: string;
  /** Machine hostname */
  hostname: string;
  /** Process ID */
  pid: number;
  /** When the instance started (ISO 8601) */
  startedAt: string;
  /** Uptime in milliseconds */
  uptimeMs: number;
}

// ============================================================================
// Instance ID Generation
// ============================================================================

/**
 * Generate a unique instance ID.
 *
 * Format: `inst_<timestamp-hex>_<random-hex>`
 * - Timestamp component provides rough temporal ordering
 * - Random component ensures uniqueness across concurrent starts
 *
 * @returns A unique instance identifier string
 */
function generateInstanceId(): string {
  const timestamp = Date.now().toString(16);
  const random = randomBytes(6).toString('hex');
  return `inst_${timestamp}_${random}`;
}

// ============================================================================
// Module State (singleton per process)
// ============================================================================

/** The instance ID, generated once on module load */
const INSTANCE_ID = generateInstanceId();

/** The start time, captured once on module load */
const START_TIME = new Date();

/** The hostname, captured once on module load */
const HOSTNAME = hostname();

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the unique instance ID for this process.
 *
 * The ID is generated once on module load and remains stable
 * for the lifetime of the process.
 *
 * @returns The instance ID string
 *
 * @example
 * ```ts
 * import { getInstanceId } from '@bslt/server-system';
 *
 * logger.info('Processing request', { instanceId: getInstanceId() });
 * ```
 */
export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Get metadata about the current running instance.
 *
 * Useful for health checks, monitoring dashboards, and distributed
 * system coordination.
 *
 * @returns Instance metadata including ID, hostname, PID, start time, and uptime
 *
 * @example
 * ```ts
 * import { getInstanceMetadata } from '@bslt/server-system';
 *
 * const meta = getInstanceMetadata();
 * console.log(`Instance ${meta.instanceId} running on ${meta.hostname} (PID: ${meta.pid})`);
 * ```
 */
export function getInstanceMetadata(): InstanceMetadata {
  return {
    instanceId: INSTANCE_ID,
    hostname: HOSTNAME,
    pid: process.pid,
    startedAt: START_TIME.toISOString(),
    uptimeMs: Date.now() - START_TIME.getTime(),
  };
}
