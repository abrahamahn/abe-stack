// src/shared/src/utils/pubsub/types.ts
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

/** Result of parsing a record subscription key */
export interface ParsedRecordKey {
  table: string;
  id: string;
}

/**
 * Parse a record subscription key into table and id.
 * Returns undefined if the key is not a valid record key format.
 *
 * Valid format: `record:{table}:{id}`
 * - table: alphanumeric and underscores, starts with letter or underscore
 * - id: alphanumeric, hyphens, and underscores (UUID-safe)
 */
export function parseRecordKey(key: string): ParsedRecordKey | undefined {
  const parts = key.split(':');
  if (parts.length !== 3 || parts[0] !== 'record') return undefined;

  const [, table, id] = parts;
  if (table == null || table === '' || id == null || id === '') return undefined;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) return undefined;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return undefined;

  return { table, id };
}

// Helper to create subscription keys
export const SubKeys = {
  record: (table: string, id: string): RecordKey => `record:${table}:${id}`,
  list: (userId: string, listType: string): ListKey => `list:${userId}:${listType}`,
} as const;
