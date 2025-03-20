import { Post } from "@models/social/Post";
import { MetricsService } from "@services/app/social/monitoring/MetricsService";

import { CacheManager } from "./CacheManager";

export class PostCacheManager extends CacheManager<string, Post> {
  private readonly metrics: MetricsService;
  private readonly prefetchThreshold = 0.8; // Trigger prefetch when 80% of TTL has elapsed

  constructor(namespace: string = "posts", ttlSeconds: number = 3600) {
    super(namespace, ttlSeconds);
    this.metrics = MetricsService.getInstance();
  }

  public async get<T extends Post = Post>(
    key: string,
    operation: string = "default",
  ): Promise<T | null> {
    const value = await super.get<T>(key);
    if (value) {
      this.metrics.recordCacheHit(operation);
      // Check if we need to extend TTL
      await this.extendTTLIfNeeded(key, value);
    } else {
      this.metrics.recordCacheMiss(operation);
    }
    return value;
  }

  public async set(key: string, value: Post): Promise<void> {
    await super.set(key, value);
    this.metrics.incrementPostsByType(value.type);
  }

  public async mget(keys: string[]): Promise<(Post | null)[]> {
    const operation = "batch_get";
    const values = await super.mget(keys);
    const hits = values.filter((v) => v !== null).length;
    const misses = values.length - hits;

    if (hits > 0) this.metrics.recordCacheHit(operation);
    if (misses > 0) this.metrics.recordCacheMiss(operation);

    return values;
  }

  public async mset(entries: { key: string; value: Post }[]): Promise<void> {
    await super.mset(entries);
    entries.forEach((entry) => {
      this.metrics.incrementPostsByType(entry.value.type);
    });
  }

  public async invalidate(key: string): Promise<void> {
    await super.delete(key);
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.getKeysByPattern(pattern);
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }

  private async extendTTLIfNeeded(key: string, value: Post): Promise<void> {
    const ttl = await this.getTTL(key);
    const maxTTL = this.ttlSeconds;

    if (ttl < maxTTL * this.prefetchThreshold) {
      await this.set(key, value);
    }
  }

  public generateCacheKey(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );

    return `${this.namespace}:${JSON.stringify(sortedParams)}`;
  }

  public async warmUp(posts: Post[]): Promise<void> {
    const entries = posts.map((post) => ({
      key: post.id,
      value: post,
    }));
    await this.mset(entries);
  }

  private async getKeysByPattern(_pattern: string): Promise<string[]> {
    // Implementation depends on your cache backend
    // For Redis, you would use KEYS or SCAN
    // For in-memory cache, you might need to filter keys manually
    return [];
  }

  private async getTTL(_key: string): Promise<number> {
    // Implementation depends on your cache backend
    // For Redis, you would use TTL command
    // For in-memory cache, you might need to track expiration times separately
    return 0;
  }
}
