// apps/server/src/infrastructure/messaging/pubsub/__tests__/postgresPubSub.test.ts
import { describe, expect, test } from 'vitest';

import { createPostgresPubSub } from '../postgresPubSub';

// ============================================================================
// PostgresPubSub Tests (testable parts without actual Postgres)
// ============================================================================

describe('PostgresPubSub', () => {
  describe('createPostgresPubSub', () => {
    test('should create instance with required options', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub).toBeDefined();
      expect(pubsub.isActive).toBe(false);
    });

    test('should create instance with custom channel', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
        channel: 'custom_channel',
      });

      expect(pubsub).toBeDefined();
    });

    test('should generate unique instance ID', () => {
      const pubsub1 = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      const pubsub2 = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub1.id).toBeDefined();
      expect(pubsub2.id).toBeDefined();
      expect(pubsub1.id).not.toBe(pubsub2.id);
    });

    test('should have id in expected format (timestamp-random)', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      // ID format: {timestamp in base36}-{random chars}
      expect(pubsub.id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('isActive property', () => {
    test('should return false before start', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      expect(pubsub.isActive).toBe(false);
    });
  });

  describe('publish without start', () => {
    test('should throw error when publishing before start', async () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      await expect(pubsub.publish('record:users:123', 5)).rejects.toThrow(
        'PostgresPubSub not started',
      );
    });
  });

  describe('onMessage callback', () => {
    test('should accept onMessage callback in constructor', () => {
      const onMessage = () => {};

      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
        onMessage,
      });

      expect(pubsub).toBeDefined();
    });
  });

  describe('default channel', () => {
    test('should use default channel when not specified', () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      // Should be created without error
      expect(pubsub).toBeDefined();
    });
  });

  describe('stop without start', () => {
    test('should handle stop when not started', async () => {
      const pubsub = createPostgresPubSub({
        connectionString: 'postgres://test:test@localhost:5432/test',
      });

      // Should not throw
      await expect(pubsub.stop()).resolves.not.toThrow();
    });
  });
});
