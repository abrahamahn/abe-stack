// main/server/system/src/pubsub/postgres-pubsub.ts
/**
 * PostgreSQL NOTIFY/LISTEN Pub/Sub Adapter
 *
 * Re-exported from @bslt/db where the implementation lives (uses postgres driver directly).
 * Canonical entry point for consumers is @bslt/server-system.
 */

export { PostgresPubSub, createPostgresPubSub } from '@bslt/db';
export type { PostgresPubSubOptions, PubSubMessage } from '@bslt/db';
