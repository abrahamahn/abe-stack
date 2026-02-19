// main/server/system/src/system/types.ts
import type { AppConfig } from '../config';
import type {
  EmailService,
  HealthCheckCache,
  HealthCheckDatabase,
  HealthCheckPubSub,
  HealthCheckQueue,
  Logger,
  StorageClient,
} from '@bslt/shared';

/**
 * Minimal context required by system health-check functions.
 *
 * Intentionally free of @bslt/db imports so that the health module
 * remains a pure infrastructure adapter. Callers that need DB-specific
 * operations (schema validation, RLS scoping) should extend this interface
 * in their own composition layer.
 */
export interface HealthContext {
  config: AppConfig;
  /** Database handle for connectivity checks (shared interface only — no raw SQL). */
  db: HealthCheckDatabase;
  cache: HealthCheckCache;
  queue: HealthCheckQueue;
  pubsub: HealthCheckPubSub;
  log: Logger;
  /** Optional: email service — used when present for email health checks. */
  email?: EmailService;
  /** Optional: storage service — used when present for storage health checks. */
  storage?: StorageClient;
}
