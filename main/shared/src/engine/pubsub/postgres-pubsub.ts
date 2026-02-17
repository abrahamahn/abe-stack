// main/shared/src/engine/pubsub/postgres-pubsub.ts
/**
 * PostgresPubSub Type Definitions
 *
 * Server-only PostgreSQL LISTEN/NOTIFY pub/sub adapter types.
 * The implementation lives in @abe-stack/db (server-side only).
 * This file provides type definitions for use in shared code.
 */

import type { SubscriptionKey } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Message received from PostgreSQL NOTIFY channel.
 */
export interface PubSubMessage {
  /** Subscription key (record or list key) */
  key: SubscriptionKey;
  /** Data version number */
  version: number;
}

/**
 * Options for creating a PostgresPubSub adapter.
 */
export interface PostgresPubSubOptions {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Channel name for LISTEN/NOTIFY (default: 'pubsub') */
  channel?: string;
  /** Error handler callback */
  onError?: (error: Error) => void;
}

/**
 * PostgreSQL LISTEN/NOTIFY pub/sub adapter interface.
 * Enables cross-instance real-time messaging for horizontal scaling.
 */
export interface PostgresPubSub {
  /** Publish an update to other instances via PostgreSQL NOTIFY */
  publish(key: SubscriptionKey, version: number): Promise<void>;
  /** Start listening for messages */
  start(): Promise<void>;
  /** Stop listening and clean up */
  stop(): Promise<void>;
}
