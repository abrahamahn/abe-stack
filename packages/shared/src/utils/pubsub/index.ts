// core/src/infrastructure/pubsub/index.ts
/**
 * Real-time Pub/Sub System
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * NOTE: PostgresPubSub (server-only) is exported separately from './postgres-pubsub'
 * to avoid bundling Node.js dependencies in browser code.
 */

// Types (browser-safe)
export { SubKeys } from './types';
export type {
  ClientMessage,
  ListKey,
  RecordKey,
  ServerMessage,
  SubscriptionKey,
  WebSocket,
} from './types';

// Subscription manager (browser-safe - only uses type import from postgres-pubsub)
export { SubscriptionManager } from './subscription-manager';
export type { SubscriptionManagerOptions } from './subscription-manager';

// Helpers (browser-safe)
export { publishAfterWrite } from './helpers';

// Re-export types only from postgres-pubsub (no runtime code)
export type { PostgresPubSubOptions, PubSubMessage } from './postgres-pubsub';

// NOTE: For PostgresPubSub and createPostgresPubSub, import directly:
// import { PostgresPubSub, createPostgresPubSub } from '@abe-stack/shared/infrastructure/pubsub/postgres-pubsub';
// Or use the package subpath: import { ... } from '@abe-stack/shared/pubsub';
