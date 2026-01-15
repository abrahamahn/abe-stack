// apps/server/src/infra/pubsub/helpers.ts
/**
 * Pub/Sub Helpers
 */

import { SubscriptionManager } from './subscriptionManager';
import { SubKeys } from './types';

// Singleton for simple usage (can be replaced with DI)
export const pubsub = new SubscriptionManager();

/**
 * Helper to publish after a database write
 * Use with setImmediate to not block the response
 *
 * @example
 * const user = await db.update(users).set(data).returning();
 * publishAfterWrite('users', user.id, user.version);
 */
export function publishAfterWrite(table: string, id: string, version: number): void {
  setImmediate(() => {
    pubsub.publish(SubKeys.record(table, id), version);
  });
}
