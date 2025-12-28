import { CacheService } from "@/server/infrastructure/cache";
import { Post } from "@/server/database/models/social/Post";
import { MetricsService } from "@/server/services/shared/monitoring";

export class PostCacheManager {
  private readonly metrics: MetricsService;
  private readonly cacheService: CacheService;
  private readonly prefetchThreshold = 0.8; // Trigger prefetch when 80% of TTL has elapsed
  private readonly namespace: string;
  private readonly ttlSeconds: number;

  constructor(namespace: string = "posts", ttlSeconds: number = 3600) {
    this.namespace = namespace;
    this.ttlSeconds = ttlSeconds;
    this.cacheService = CacheService.getInstance();
    this.metrics = MetricsService.getInstance();
  }

  public async get<T extends Post = Post>(
    key: string,
    operation: string = "default"
  ): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);
    const value = await this.cacheService.get<T>(cacheKey);
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
    const cacheKey = this.getCacheKey(key);
    await this.cacheService.set(cacheKey, value, this.ttlSeconds);
    this.metrics.incrementPostsByType(value.type);
  }

  public async mget(keys: string[]): Promise<(Post | null)[]> {
    const operation = "batch_get";
    const cacheKeys = keys.map((key) => this.getCacheKey(key));
    const result = await this.cacheService.getMultiple<Post>(cacheKeys);

    const values = keys.map((key) => result[this.getCacheKey(key)] || null);
    const hits = values.filter((v) => v !== null).length;
    const misses = values.length - hits;

    if (hits > 0) this.metrics.recordCacheHit(operation);
    if (misses > 0) this.metrics.recordCacheMiss(operation);

    return values;
  }

  public async mset(entries: { key: string; value: Post }[]): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value);
    }
  }

  public async invalidate(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    await this.cacheService.delete(cacheKey);
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.getKeysByPattern(pattern);
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }

  private async extendTTLIfNeeded(key: string, value: Post): Promise<void> {
    const ttl = await this.getTTL(key);

    if (ttl < this.ttlSeconds * this.prefetchThreshold) {
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
        {} as Record<string, unknown>
      );

    return `${this.namespace}:${JSON.stringify(sortedParams)}`;
  }

  private getCacheKey(key: string): string {
    return `${this.namespace}:${key}`;
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
