import { Gauge, Counter, Histogram, register } from "prom-client";

export class MetricsService {
  private static instance: MetricsService;

  private readonly operationDuration: Histogram;
  private readonly operationErrors: Counter;
  private readonly activePosts: Gauge;
  private readonly postsByType: Counter;
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly rateLimit: Counter;

  private counters: Map<string, number>;
  private latencies: Map<string, number[]>;

  private constructor() {
    this.operationDuration = new Histogram({
      name: "post_operation_duration_seconds",
      help: "Duration of post operations in seconds",
      labelNames: ["operation"],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.operationErrors = new Counter({
      name: "post_operation_errors_total",
      help: "Total number of post operation errors",
      labelNames: ["operation", "error_type"],
    });

    this.activePosts = new Gauge({
      name: "active_posts_total",
      help: "Total number of active posts",
      labelNames: ["status"],
    });

    this.postsByType = new Counter({
      name: "posts_by_type_total",
      help: "Total number of posts by type",
      labelNames: ["type"],
    });

    this.cacheHits = new Counter({
      name: "post_cache_hits_total",
      help: "Total number of post cache hits",
      labelNames: ["operation"],
    });

    this.cacheMisses = new Counter({
      name: "post_cache_misses_total",
      help: "Total number of post cache misses",
      labelNames: ["operation"],
    });

    this.rateLimit = new Counter({
      name: "post_rate_limit_hits_total",
      help: "Total number of rate limit hits",
      labelNames: ["user_type"],
    });

    this.counters = new Map();
    this.latencies = new Map();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  public recordOperationDuration(operation: string, durationMs: number): void {
    this.operationDuration.labels(operation).observe(durationMs / 1000);
    this.recordLatency(operation, durationMs);
  }

  public recordOperationError(operation: string, errorType: string): void {
    this.operationErrors.labels(operation, errorType).inc();
    this.incrementCounter(`${operation}_error_${errorType}`);
  }

  public updateActivePostCount(status: string, count: number): void {
    this.activePosts.labels(status).set(count);
  }

  public incrementPostsByType(type: string): void {
    this.postsByType.labels(type).inc();
  }

  public recordCacheHit(operation: string): void {
    this.cacheHits.labels(operation).inc();
  }

  public recordCacheMiss(operation: string): void {
    this.cacheMisses.labels(operation).inc();
  }

  public recordRateLimit(userType: string): void {
    this.rateLimit.labels(userType).inc();
  }

  public async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  recordLatency(name: string, duration: number): void {
    const latencies = this.latencies.get(name) || [];
    latencies.push(duration);
    this.latencies.set(name, latencies);
  }
}
