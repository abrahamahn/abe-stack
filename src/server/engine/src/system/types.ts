// src/server/engine/src/system/types.ts

import type { AppConfig } from '../config';
import type { RawDb } from '@abe-stack/db';
import type { HealthCheckDatabase, HealthCheckPubSub, Logger } from '@abe-stack/shared';

/**
 * Context required by the system health-check functions.
 * Subset of the full AppContext to allow decoupling from Fastify/HTTP layer.
 *
 * @property config - Application configuration snapshot
 * @property db     - Database handle that satisfies both health-check and raw-query interfaces
 * @property pubsub - Pub/sub handle for connectivity checks
 * @property log    - Structured logger instance
 */
export interface SystemContext {
  config: AppConfig;
  db: HealthCheckDatabase & RawDb;
  pubsub: HealthCheckPubSub;
  log: Logger;
}
