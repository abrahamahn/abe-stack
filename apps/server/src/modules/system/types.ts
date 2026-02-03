import type { RawDb } from '@abe-stack/db';
import type { AppConfig, HealthCheckDatabase, HealthCheckPubSub } from '@abe-stack/shared';
import type { Logger } from '@abe-stack/shared';

/**
 * Context required by the system module handlers.
 * Subset of the full AppContext to allow decoupling.
 */
export interface SystemContext {
  config: AppConfig;
  db: HealthCheckDatabase & RawDb;
  pubsub: HealthCheckPubSub;
  log: Logger;
}
