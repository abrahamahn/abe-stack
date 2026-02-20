// main/server/system/src/pubsub/index.ts
/**
 * PubSub Module
 *
 * PostgreSQL NOTIFY/LISTEN pub/sub adapter for cross-instance messaging.
 *
 * Canonical location: @bslt/server-system
 * Re-exported from @bslt/db for backwards compatibility.
 */
export { PostgresPubSub, createPostgresPubSub } from './postgres-pubsub';
export type { PostgresPubSubOptions, PubSubMessage } from './postgres-pubsub';
