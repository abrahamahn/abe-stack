// shared/core/src/infrastructure/pubsub/helpers.ts
/**
 * Pub/Sub Helpers
 */

import { SubKeys } from './types';

import type { SubscriptionManager } from './subscription-manager';

/**
 * Helper to publish after a database write
 * Use with setImmediate to not block the response
 *
 * @example
 * const user = await db.update(users).set(data).returning();
 * publishAfterWrite(ctx.pubsub, 'users', user.id, user.version);
 */
export function publishAfterWrite(
  pubsub: SubscriptionManager,
  table: string,
  id: string,
  version: number,
): void {
  setImmediate(() => {
    pubsub.publish(SubKeys.record(table, id), version);
  });
}
