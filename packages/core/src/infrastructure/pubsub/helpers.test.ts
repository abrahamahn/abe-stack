// packages/core/src/infrastructure/pubsub/helpers.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publishAfterWrite } from './helpers';

import type { SubscriptionManager } from './subscription-manager';

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

      const call = (mockPubsub.publish as any).mock.calls[0];
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
