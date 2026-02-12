// src/server/db/src/read-replica.ts

import { createRawDb } from './client';

import type { RawDb } from './client';

/** Default grace period (ms) after a write where reads route to primary */
const DEFAULT_WRITE_GRACE_MS = 2000;

export interface ReadReplicaClient {
  /** Primary database client (for all writes) */
  primary: RawDb;
  /** Replica database client (for reads, falls back to primary if no replica) */
  replica: RawDb;
  /** Alias for replica */
  read: RawDb;
  /** Alias for primary */
  write: RawDb;
  /** Get the appropriate client for a read, considering replication lag */
  readClient(options?: { consistency?: 'strong' | 'eventual' }): RawDb;
  /** Mark that a write just occurred (routes reads to primary for grace period) */
  markWrite(): void;
}

export interface ReadReplicaOptions {
  /** Grace period in ms after a write where reads route to primary (default: 2000) */
  writeGraceMs?: number;
  /** Max connections per pool — passed through to postgres driver (default: 10) */
  maxConnections?: number;
}

/**
 * Create a read-replica-aware database client pair.
 * When replicaUrl is undefined or empty, both read and write point to the same primary client.
 *
 * The `readClient()` method handles replication lag by routing reads to primary
 * for a configurable grace period after any write (read-your-own-writes pattern).
 */
export function createReadReplicaClient(
  primaryUrl: string,
  replicaUrl?: string,
  options?: ReadReplicaOptions,
): ReadReplicaClient {
  const writeGraceMs = options?.writeGraceMs ?? DEFAULT_WRITE_GRACE_MS;

  const primary = createRawDb(
    options?.maxConnections !== undefined
      ? { connectionString: primaryUrl, maxConnections: options.maxConnections }
      : primaryUrl,
  );

  let lastWriteAt = 0;

  const markWrite = (): void => {
    lastWriteAt = Date.now();
  };

  if (replicaUrl === undefined || replicaUrl === '') {
    return {
      primary,
      replica: primary,
      read: primary,
      write: primary,
      readClient: () => primary,
      markWrite,
    };
  }

  const replica = createRawDb(
    options?.maxConnections !== undefined
      ? { connectionString: replicaUrl, maxConnections: options.maxConnections }
      : replicaUrl,
  );

  const readClient = (readOptions?: { consistency?: 'strong' | 'eventual' }): RawDb => {
    if (readOptions?.consistency === 'strong') {
      return primary;
    }
    // Within grace period after a write, route to primary (read-your-own-writes)
    if (Date.now() - lastWriteAt < writeGraceMs) {
      return primary;
    }
    return replica;
  };

  return {
    primary,
    replica,
    read: replica,
    write: primary,
    readClient,
    markWrite,
  };
}
