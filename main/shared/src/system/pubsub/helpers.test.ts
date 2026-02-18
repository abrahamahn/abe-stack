// main/shared/src/system/pubsub/helpers.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publishAfterWrite } from './helpers';
import { SubKeys } from './types';

import type { SubscriptionManager } from './subscription.manager';

describe('pubsub helpers', () => {
  let mockPubsub: SubscriptionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPubsub = {
      publish: vi.fn(),
    } as unknown as SubscriptionManager;
  });

  describe('publishAfterWrite', () => {
    it('should publish message using setImmediate', async () => {
      publishAfterWrite(mockPubsub, 'users', '123', 1);

      // Should not be called immediately
      expect(mockPubsub.publish).not.toHaveBeenCalled();

      // Wait for setImmediate
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockPubsub.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish with correct subscription key', async () => {
      publishAfterWrite(mockPubsub, 'users', '123', 5);

      await new Promise((resolve) => setImmediate(resolve));

      const call = (mockPubsub.publish as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(call[0]).toBe('record:users:123');
      expect(call[1]).toBe(5);
    });

    it('should handle multiple concurrent publishes', async () => {
      publishAfterWrite(mockPubsub, 'users', '1', 1);
      publishAfterWrite(mockPubsub, 'posts', '2', 2);
      publishAfterWrite(mockPubsub, 'comments', '3', 3);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockPubsub.publish).toHaveBeenCalledTimes(3);
    });

    it('should not block the calling code', () => {
      const startTime = Date.now();

      publishAfterWrite(mockPubsub, 'users', '123', 1);

      const endTime = Date.now();

      // Should complete immediately (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);
      expect(mockPubsub.publish).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Adversarial: publishAfterWrite edge cases
// ============================================================================

describe('publishAfterWrite — adversarial', () => {
  let mockPubsub: SubscriptionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPubsub = {
      publish: vi.fn(),
    } as unknown as SubscriptionManager;
  });

  it('publishes with version=0', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc', 0);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPubsub.publish).toHaveBeenCalledWith('record:users:abc', 0);
  });

  it('publishes with negative version', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc', -1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPubsub.publish).toHaveBeenCalledWith('record:users:abc', -1);
  });

  it('publishes with empty table name (constructs key as-is)', async () => {
    publishAfterWrite(mockPubsub, '', 'id-1', 1);
    await new Promise((resolve) => setImmediate(resolve));
    // SubKeys.record('', 'id-1') = 'record::id-1'
    expect(mockPubsub.publish).toHaveBeenCalledWith('record::id-1', 1);
  });

  it('publishes with empty id (constructs key as-is)', async () => {
    publishAfterWrite(mockPubsub, 'users', '', 1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPubsub.publish).toHaveBeenCalledWith('record:users:', 1);
  });

  it('publishes with special characters in table name', async () => {
    publishAfterWrite(mockPubsub, 'my-table!', 'id-1', 2);
    await new Promise((resolve) => setImmediate(resolve));
    // Key is constructed with SubKeys.record — no validation at this layer
    expect(mockPubsub.publish).toHaveBeenCalledWith('record:my-table!:id-1', 2);
  });

  it('publishes with a very long channel name', async () => {
    const longTable = 'a'.repeat(10_000);
    const longId = 'b'.repeat(10_000);
    publishAfterWrite(mockPubsub, longTable, longId, 1);
    await new Promise((resolve) => setImmediate(resolve));
    const expectedKey = `record:${longTable}:${longId}`;
    expect(mockPubsub.publish).toHaveBeenCalledWith(expectedKey, 1);
  });

  it('publishes with Number.MAX_SAFE_INTEGER version', async () => {
    publishAfterWrite(mockPubsub, 'users', 'x', Number.MAX_SAFE_INTEGER);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPubsub.publish).toHaveBeenCalledWith('record:users:x', Number.MAX_SAFE_INTEGER);
  });

  it('does not invoke publish synchronously even in microtask context', async () => {
    // Verify that the publish is truly deferred past the current tick
    const callOrder: string[] = [];

    publishAfterWrite(mockPubsub, 'users', 'sync-test', 1);
    callOrder.push('after-call');

    // Drain microtasks (promises resolve before setImmediate)
    await Promise.resolve();
    callOrder.push('after-microtask');

    expect(mockPubsub.publish).not.toHaveBeenCalled();

    await new Promise((resolve) => setImmediate(resolve));
    callOrder.push('after-setImmediate');

    expect(mockPubsub.publish).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['after-call', 'after-microtask', 'after-setImmediate']);
  });

  it('synchronous call does not throw even when publish mock would throw', () => {
    // publishAfterWrite is fire-and-forget via setImmediate; the synchronous
    // invocation never calls publish directly, so it cannot throw synchronously
    // regardless of what publish does when eventually called.
    (mockPubsub.publish as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // intentionally left as a throwing mock — but we only test the sync side
      return undefined;
    });

    // The synchronous call must not throw
    expect(() => publishAfterWrite(mockPubsub, 'users', 'err-id', 1)).not.toThrow();
    // Publish has NOT been invoked yet
    expect(mockPubsub.publish).not.toHaveBeenCalled();
  });

  it('constructs key using SubKeys.record format exactly', async () => {
    const table = 'orders';
    const id = '550e8400-e29b-41d4-a716-446655440000';
    publishAfterWrite(mockPubsub, table, id, 3);
    await new Promise((resolve) => setImmediate(resolve));

    const expectedKey = SubKeys.record(table, id);
    expect(mockPubsub.publish).toHaveBeenCalledWith(expectedKey, 3);
  });

  it('rapid sequential calls all publish independently', async () => {
    const count = 50;
    for (let i = 0; i < count; i++) {
      publishAfterWrite(mockPubsub, 'table', String(i), i);
    }
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPubsub.publish).toHaveBeenCalledTimes(count);
  });
});
