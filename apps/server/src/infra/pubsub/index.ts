// apps/server/src/infra/pubsub/index.ts
/**
 * Real-time Pub/Sub System
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * Horizontal Scaling:
 * - PostgresPubSub uses Postgres NOTIFY/LISTEN for cross-instance messaging
 * - No Redis dependency required
 */

// Types
export type {
  WebSocket,
  RecordKey,
  ListKey,
  SubscriptionKey,
  ClientMessage,
  ServerMessage,
} from './types';
export { SubKeys } from './types';

// Subscription manager
export { SubscriptionManager } from './subscriptionManager';
export type { SubscriptionManagerOptions } from './subscriptionManager';

// Postgres NOTIFY/LISTEN adapter
export { PostgresPubSub, createPostgresPubSub } from './postgresPubSub';
export type { PostgresPubSubOptions, PubSubMessage } from './postgresPubSub';

// Helpers
export { pubsub, publishAfterWrite } from './helpers';
