// src/server/engine/src/system/metrics.ts
/**
 * In-Memory Metrics Collector
 *
 * Lightweight request metrics collector using Map-based counters.
 * No external dependencies -- suitable for single-instance deployments.
 * For multi-instance production use, replace with Prometheus or similar.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Summary of collected request metrics.
 */
export interface MetricsSummary {
  /** Total request count since last reset */
  requests: {
    total: number;
    byRoute: Record<string, number>;
    byStatus: Record<string, number>;
  };
  /** Latency distribution in milliseconds */
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  /** Uptime in seconds since collector was created or last reset */
  uptimeSeconds: number;
  /** ISO 8601 timestamp of when the summary was generated */
  collectedAt: string;
}

// ============================================================================
// Percentile Calculation
// ============================================================================

/**
 * Calculate the value at a given percentile from a sorted array.
 *
 * @param sorted - Pre-sorted array of numbers (ascending)
 * @param percentile - Percentile value between 0 and 100
 * @returns The value at the given percentile, or 0 for empty arrays
 * @complexity O(1) for lookup (caller must pre-sort)
 */
function percentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

// ============================================================================
// Metrics Collector
// ============================================================================

/**
 * In-memory metrics collector.
 *
 * Thread-safe for single-threaded Node.js runtimes.
 * Stores request counts by route and status code, plus raw latency
 * values for percentile calculation.
 */
export class MetricsCollector {
  private readonly routeCounts = new Map<string, number>();
  private readonly statusCounts = new Map<string, number>();
  private latencies: number[] = [];
  private totalRequests = 0;
  private startedAt = Date.now();

  /**
   * Maximum number of latency samples to retain.
   * Prevents unbounded memory growth on long-running servers.
   * When exceeded, oldest samples are dropped.
   */
  private readonly maxLatencySamples: number;

  constructor(options?: { maxLatencySamples?: number }) {
    this.maxLatencySamples = options?.maxLatencySamples ?? 10_000;
  }

  // ==========================================================================
  // Recording
  // ==========================================================================

  /**
   * Increment the request counter for a given route and status code.
   *
   * @param route - The API route path (e.g. '/api/users')
   * @param statusCode - HTTP response status code
   */
  incrementRequestCount(route: string, statusCode: number): void {
    this.totalRequests += 1;

    const currentRouteCount = this.routeCounts.get(route) ?? 0;
    this.routeCounts.set(route, currentRouteCount + 1);

    const statusKey = String(statusCode);
    const currentStatusCount = this.statusCounts.get(statusKey) ?? 0;
    this.statusCounts.set(statusKey, currentStatusCount + 1);
  }

  /**
   * Record a request latency value.
   *
   * @param _route - The API route path (reserved for future per-route latency)
   * @param durationMs - Request duration in milliseconds
   */
  recordRequestLatency(_route: string, durationMs: number): void {
    if (this.latencies.length >= this.maxLatencySamples) {
      // Drop oldest sample to prevent unbounded growth
      this.latencies.shift();
    }
    this.latencies.push(durationMs);
  }

  // ==========================================================================
  // Retrieval
  // ==========================================================================

  /**
   * Build a summary of all collected metrics.
   *
   * @returns Aggregated metrics snapshot
   * @complexity O(n log n) where n = number of latency samples (sorting)
   */
  getMetricsSummary(): MetricsSummary {
    const byRoute: Record<string, number> = {};
    for (const [route, count] of this.routeCounts) {
      byRoute[route] = count;
    }

    const byStatus: Record<string, number> = {};
    for (const [status, count] of this.statusCounts) {
      byStatus[status] = count;
    }

    // Sort latencies for percentile calculation
    const sorted = [...this.latencies].sort((a, b) => a - b);

    const avg = sorted.length > 0 ? sorted.reduce((sum, val) => sum + val, 0) / sorted.length : 0;

    return {
      requests: {
        total: this.totalRequests,
        byRoute,
        byStatus,
      },
      latency: {
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        avg: Math.round(avg * 100) / 100,
      },
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      collectedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Management
  // ==========================================================================

  /**
   * Reset all collected metrics.
   * Useful for testing or periodic metric windows.
   */
  reset(): void {
    this.routeCounts.clear();
    this.statusCounts.clear();
    this.latencies = [];
    this.totalRequests = 0;
    this.startedAt = Date.now();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Global metrics collector singleton for the server process. */
let globalCollector: MetricsCollector | null = null;

/**
 * Get the global MetricsCollector singleton.
 * Creates one on first access.
 *
 * @returns The singleton MetricsCollector instance
 */
export function getMetricsCollector(): MetricsCollector {
  globalCollector ??= new MetricsCollector();
  return globalCollector;
}

/**
 * Reset the global MetricsCollector singleton.
 * Primarily for testing -- creates a fresh instance on next access.
 */
export function resetMetricsCollector(): void {
  globalCollector = null;
}
