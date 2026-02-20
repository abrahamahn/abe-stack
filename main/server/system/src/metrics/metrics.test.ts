// main/server/system/src/metrics/metrics.test.ts
/**
 * Metrics Collector Tests
 *
 * Verifies counter increments, latency percentile calculations,
 * summary shape, and reset behavior.
 */
import { afterEach, describe, expect, test } from 'vitest';

import { getMetricsCollector, MetricsCollector, resetMetricsCollector } from './metrics';

// ============================================================================
// MetricsCollector Unit Tests
// ============================================================================

describe('MetricsCollector', () => {
  // --------------------------------------------------------------------------
  // Request Counting
  // --------------------------------------------------------------------------

  describe('incrementRequestCount', () => {
    test('should track total request count', () => {
      const collector = new MetricsCollector();

      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/auth/login', 401);

      const summary = collector.getMetricsSummary();
      expect(summary.requests.total).toBe(3);
    });

    test('should track counts by route', () => {
      const collector = new MetricsCollector();

      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/auth/login', 200);

      const summary = collector.getMetricsSummary();
      expect(summary.requests.byRoute['/api/users']).toBe(2);
      expect(summary.requests.byRoute['/api/auth/login']).toBe(1);
    });

    test('should track counts by status code', () => {
      const collector = new MetricsCollector();

      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/users', 404);
      collector.incrementRequestCount('/api/auth/login', 500);

      const summary = collector.getMetricsSummary();
      expect(summary.requests.byStatus['200']).toBe(2);
      expect(summary.requests.byStatus['404']).toBe(1);
      expect(summary.requests.byStatus['500']).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Latency Recording
  // --------------------------------------------------------------------------

  describe('recordRequestLatency', () => {
    test('should calculate correct p50 percentile', () => {
      const collector = new MetricsCollector();

      // Record 10 latency values: 10, 20, 30, ..., 100
      for (let i = 1; i <= 10; i++) {
        collector.recordRequestLatency('/api/test', i * 10);
      }

      const summary = collector.getMetricsSummary();
      // p50 of [10,20,30,40,50,60,70,80,90,100] = 50
      expect(summary.latency.p50).toBe(50);
    });

    test('should calculate correct p95 percentile', () => {
      const collector = new MetricsCollector();

      // Record 100 values: 1..100
      for (let i = 1; i <= 100; i++) {
        collector.recordRequestLatency('/api/test', i);
      }

      const summary = collector.getMetricsSummary();
      // p95 of 1..100 = 95
      expect(summary.latency.p95).toBe(95);
    });

    test('should calculate correct p99 percentile', () => {
      const collector = new MetricsCollector();

      // Record 100 values: 1..100
      for (let i = 1; i <= 100; i++) {
        collector.recordRequestLatency('/api/test', i);
      }

      const summary = collector.getMetricsSummary();
      // p99 of 1..100 = 99
      expect(summary.latency.p99).toBe(99);
    });

    test('should calculate average latency', () => {
      const collector = new MetricsCollector();

      collector.recordRequestLatency('/api/test', 10);
      collector.recordRequestLatency('/api/test', 20);
      collector.recordRequestLatency('/api/test', 30);

      const summary = collector.getMetricsSummary();
      expect(summary.latency.avg).toBe(20);
    });

    test('should return zero percentiles when no latencies recorded', () => {
      const collector = new MetricsCollector();

      const summary = collector.getMetricsSummary();
      expect(summary.latency.p50).toBe(0);
      expect(summary.latency.p95).toBe(0);
      expect(summary.latency.p99).toBe(0);
      expect(summary.latency.avg).toBe(0);
    });

    test('should respect maxLatencySamples limit', () => {
      const collector = new MetricsCollector({ maxLatencySamples: 5 });

      // Record 10 values, only last 5 should be kept
      for (let i = 1; i <= 10; i++) {
        collector.recordRequestLatency('/api/test', i * 10);
      }

      const summary = collector.getMetricsSummary();
      // Latencies should be [60, 70, 80, 90, 100] after dropping first 5
      // p50 = 80
      expect(summary.latency.p50).toBe(80);
    });
  });

  // --------------------------------------------------------------------------
  // Summary Shape
  // --------------------------------------------------------------------------

  describe('getMetricsSummary', () => {
    test('should return expected shape', () => {
      const collector = new MetricsCollector();

      collector.incrementRequestCount('/api/users', 200);
      collector.recordRequestLatency('/api/users', 15);

      const summary = collector.getMetricsSummary();

      expect(summary).toEqual({
        requests: {
          total: expect.any(Number),
          byRoute: expect.any(Object),
          byStatus: expect.any(Object),
        },
        latency: {
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
          avg: expect.any(Number),
        },
        jobs: {
          enqueued: expect.any(Number),
          processed: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          byName: expect.any(Object),
        },
        auth: {
          loginAttempts: expect.any(Number),
          loginSuccess: expect.any(Number),
          loginFailures: expect.any(Number),
          lockouts: expect.any(Number),
          byProvider: expect.any(Object),
        },
        uptimeSeconds: expect.any(Number),
        collectedAt: expect.any(String),
      });
    });

    test('should include ISO 8601 timestamp', () => {
      const collector = new MetricsCollector();
      const summary = collector.getMetricsSummary();

      // Verify it parses as a valid date
      const date = new Date(summary.collectedAt);
      expect(date.getTime()).not.toBeNaN();
    });

    test('should report non-negative uptime', () => {
      const collector = new MetricsCollector();
      const summary = collector.getMetricsSummary();

      expect(summary.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  describe('reset', () => {
    test('should clear all request counts', () => {
      const collector = new MetricsCollector();

      collector.incrementRequestCount('/api/users', 200);
      collector.incrementRequestCount('/api/auth', 401);
      collector.reset();

      const summary = collector.getMetricsSummary();
      expect(summary.requests.total).toBe(0);
      expect(Object.keys(summary.requests.byRoute)).toHaveLength(0);
      expect(Object.keys(summary.requests.byStatus)).toHaveLength(0);
    });

    test('should clear all latency data', () => {
      const collector = new MetricsCollector();

      collector.recordRequestLatency('/api/test', 100);
      collector.recordRequestLatency('/api/test', 200);
      collector.reset();

      const summary = collector.getMetricsSummary();
      expect(summary.latency.p50).toBe(0);
      expect(summary.latency.p95).toBe(0);
      expect(summary.latency.p99).toBe(0);
      expect(summary.latency.avg).toBe(0);
    });

    test('should reset uptime counter', () => {
      const collector = new MetricsCollector();

      collector.reset();
      const summary = collector.getMetricsSummary();

      expect(summary.uptimeSeconds).toBe(0);
    });
  });
});

// ============================================================================
// Singleton Tests
// ============================================================================

describe('Metrics Singleton', () => {
  afterEach(() => {
    resetMetricsCollector();
  });

  test('should return the same instance on repeated calls', () => {
    const a = getMetricsCollector();
    const b = getMetricsCollector();

    expect(a).toBe(b);
  });

  test('should return a fresh instance after reset', () => {
    const a = getMetricsCollector();
    a.incrementRequestCount('/api/test', 200);

    resetMetricsCollector();
    const b = getMetricsCollector();

    expect(a).not.toBe(b);
    expect(b.getMetricsSummary().requests.total).toBe(0);
  });
});
