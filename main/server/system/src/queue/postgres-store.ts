// main/server/system/src/queue/postgres-store.ts
/**
 * PostgreSQL Queue Store
 *
 * Re-exported from @bslt/db where the implementation lives (tightly coupled to DbClient).
 * Canonical entry point for consumers is @bslt/server-system.
 */

export { PostgresQueueStore, createPostgresQueueStore } from '@bslt/db';
