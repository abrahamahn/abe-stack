// apps/server/src/infra/pubsub/index.ts
/**
 * Real-time Pub/Sub System
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
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

// Helpers
export { pubsub, publishAfterWrite } from './helpers';
