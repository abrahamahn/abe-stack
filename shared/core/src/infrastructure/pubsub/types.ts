// shared/core/src/infrastructure/pubsub/types.ts
/**
 * Pub/Sub Types
 *
 * Subscription Key Format:
 * - `record:{table}:{id}` - Single record updates
 * - `list:{userId}:{listType}` - List/collection updates
 */

// Minimal WebSocket interface for our pub/sub needs
// This avoids requiring @types/ws when not using websockets
export interface WebSocket {
  readyState: number;
  send(data: string): void;
}

// Subscription key types for type safety
export type RecordKey = `record:${string}:${string}`;
export type ListKey = `list:${string}:${string}`;
export type SubscriptionKey = RecordKey | ListKey;

// Message types
export type ClientMessage =
  | { type: 'subscribe'; key: SubscriptionKey }
  | { type: 'unsubscribe'; key: SubscriptionKey };

export type ServerMessage = { type: 'update'; key: SubscriptionKey; version: number };

// Helper to create subscription keys
export const SubKeys = {
  record: (table: string, id: string): RecordKey => `record:${table}:${id}`,
  list: (userId: string, listType: string): ListKey => `list:${userId}:${listType}`,
} as const;
