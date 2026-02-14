// main/server/websocket/src/stats.test.ts
/**
 * WebSocket Stats Unit Tests
 *
 * Tests for connection tracking and plugin registration state.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  decrementConnections,
  getWebSocketStats,
  incrementConnections,
  markPluginRegistered,
  resetStats,
} from './stats';

// ============================================================================
// Tests
// ============================================================================

describe('WebSocket Stats', () => {
  beforeEach(() => {
    resetStats();
  });

  afterEach(() => {
    resetStats();
  });

  describe('getWebSocketStats', () => {
    test('should return initial stats with zero connections', () => {
      const stats = getWebSocketStats();

      expect(stats.activeConnections).toBe(0);
      expect(stats.pluginRegistered).toBe(false);
    });

    test('should return correct shape', () => {
      const stats = getWebSocketStats();

      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('pluginRegistered');
      expect(typeof stats.activeConnections).toBe('number');
      expect(typeof stats.pluginRegistered).toBe('boolean');
    });
  });

  describe('incrementConnections', () => {
    test('should increase active connections', () => {
      incrementConnections();

      const stats = getWebSocketStats();
      expect(stats.activeConnections).toBe(1);
    });

    test('should return new count', () => {
      const count = incrementConnections();
      expect(count).toBe(1);

      const count2 = incrementConnections();
      expect(count2).toBe(2);
    });

    test('should track multiple connections', () => {
      incrementConnections();
      incrementConnections();
      incrementConnections();

      const stats = getWebSocketStats();
      expect(stats.activeConnections).toBe(3);
    });
  });

  describe('decrementConnections', () => {
    test('should decrease active connections', () => {
      incrementConnections();
      incrementConnections();

      decrementConnections();

      const stats = getWebSocketStats();
      expect(stats.activeConnections).toBe(1);
    });

    test('should return new count', () => {
      incrementConnections();
      incrementConnections();

      const count = decrementConnections();
      expect(count).toBe(1);
    });
  });

  describe('markPluginRegistered', () => {
    test('should mark plugin as registered', () => {
      markPluginRegistered();

      const stats = getWebSocketStats();
      expect(stats.pluginRegistered).toBe(true);
    });
  });

  describe('resetStats', () => {
    test('should reset all stats to initial values', () => {
      incrementConnections();
      incrementConnections();
      markPluginRegistered();

      resetStats();

      const stats = getWebSocketStats();
      expect(stats.activeConnections).toBe(0);
      expect(stats.pluginRegistered).toBe(false);
    });
  });
});
