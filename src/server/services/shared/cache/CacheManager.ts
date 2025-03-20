export class CacheManager<K extends string = string, V = unknown> {
  private cache = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    protected namespace: string = "",
    protected ttlSeconds: number = 3600,
  ) {}

  async get<T extends V>(key: K): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      return null;
    }
    return entry.value as T;
  }

  async set(
    key: K,
    value: V,
    ttlSeconds: number = this.ttlSeconds,
  ): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: K): Promise<void> {
    this.cache.delete(key);
  }

  async mget(keys: K[]): Promise<(V | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async mset(entries: { key: K; value: V }[]): Promise<void> {
    await Promise.all(entries.map((entry) => this.set(entry.key, entry.value)));
  }
}
