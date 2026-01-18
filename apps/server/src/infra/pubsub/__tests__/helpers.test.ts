// apps/server/src/infra/pubsub/__tests__/helpers.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { publishAfterWrite } from '../helpers';
import { SubKeys } from '../types';

import type { SubscriptionManager } from '../subscriptionManager';

// ============================================================================
// SubKeys Tests
// ============================================================================

describe('SubKeys', () => {
  describe('record', () => {
    test('should create record key with table and id', () => {
      const key = SubKeys.record('users', 'abc-123');
      expect(key).toBe('record:users:abc-123');
    });

    test('should handle special characters in id', () => {
      const key = SubKeys.record('posts', 'id-with-dashes-123');
      expect(key).toBe('record:posts:id-with-dashes-123');
    });

    test('should handle uuid format', () => {
      const key = SubKeys.record('orders', '550e8400-e29b-41d4-a716-446655440000');
      expect(key).toBe('record:orders:550e8400-e29b-41d4-a716-446655440000');
    });

    test('should handle different table names', () => {
      expect(SubKeys.record('users', '1')).toBe('record:users:1');
      expect(SubKeys.record('posts', '2')).toBe('record:posts:2');
      expect(SubKeys.record('comments', '3')).toBe('record:comments:3');
    });

    test('should handle numeric ids', () => {
      const key = SubKeys.record('items', '12345');
      expect(key).toBe('record:items:12345');
    });
  });

  describe('list', () => {
    test('should create list key with userId and listType', () => {
      const key = SubKeys.list('user-123', 'todos');
      expect(key).toBe('list:user-123:todos');
    });

    test('should handle different list types', () => {
      const key = SubKeys.list('user-456', 'notifications');
      expect(key).toBe('list:user-456:notifications');
    });

    test('should handle various userId formats', () => {
      expect(SubKeys.list('u123', 'items')).toBe('list:u123:items');
      expect(SubKeys.list('550e8400-e29b-41d4-a716-446655440000', 'items')).toBe(
        'list:550e8400-e29b-41d4-a716-446655440000:items',
      );
    });
  });
});

// ============================================================================
// publishAfterWrite Tests
// ============================================================================

describe('publishAfterWrite', () => {
  let mockPubsub: SubscriptionManager;
  let publishMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    publishMock = vi.fn();
    mockPubsub = {
      publish: publishMock,
    } as unknown as SubscriptionManager;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should call publish with record key', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc-123', 5);

    // setImmediate is used, so we need to advance timers
    await vi.runAllTimersAsync();

    expect(publishMock).toHaveBeenCalledWith('record:users:abc-123', 5);
  });

  test('should not block execution (uses setImmediate)', async () => {
    publishAfterWrite(mockPubsub, 'users', 'abc-123', 5);

    // publish should not be called immediately
    expect(publishMock).not.toHaveBeenCalled();

    // After timers advance, it should be called
    await vi.runAllTimersAsync();
    expect(publishMock).toHaveBeenCalled();
  });

  test('should handle different table names', async () => {
    publishAfterWrite(mockPubsub, 'posts', 'post-1', 10);
    await vi.runAllTimersAsync();

    expect(publishMock).toHaveBeenCalledWith('record:posts:post-1', 10);
  });

  test('should handle different version numbers', async () => {
    publishAfterWrite(mockPubsub, 'items', 'item-1', 100);
    await vi.runAllTimersAsync();

    expect(publishMock).toHaveBeenCalledWith('record:items:item-1', 100);
  });

  test('should handle version 0', async () => {
    publishAfterWrite(mockPubsub, 'new-table', 'new-id', 0);
    await vi.runAllTimersAsync();

    expect(publishMock).toHaveBeenCalledWith('record:new-table:new-id', 0);
  });
});
