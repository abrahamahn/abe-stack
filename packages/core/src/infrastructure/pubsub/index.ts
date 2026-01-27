// packages/core/src/infrastructure/pubsub/index.ts
/**
 * Real-time Pub/Sub System
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * Horizontal Scaling:
 * - PostgresPubSub uses Postgres NOTIFY/LISTEN for cross-instance messaging
 */

// Types
export { SubKeys } from './types';
export type {
  ClientMessage,
  ListKey,
  RecordKey,
  ServerMessage,
  SubscriptionKey,
  WebSocket,
} from './types';

// Subscription manager
export { SubscriptionManager } from './subscription-manager';
export type { SubscriptionManagerOptions } from './subscription-manager';

// Postgres NOTIFY/LISTEN adapter
export { PostgresPubSub, createPostgresPubSub } from './postgres-pubsub';
export type { PostgresPubSubOptions, PubSubMessage } from './postgres-pubsub';

// Helpers
export { publishAfterWrite } from './helpers';
