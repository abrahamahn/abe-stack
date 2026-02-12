// src/server/core/src/cache/cache-aside.ts

import type { CacheProvider } from '@abe-stack/shared';

export async function cacheAside<T>(
  cache: CacheProvider,
  key: string,
  loader: () => Promise<T>,
  options?: { ttl?: number; tags?: string[] },
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== undefined) return cached;
  const value = await loader();
  const setOpts: { ttl?: number; tags?: string[] } = {};
  if (options?.ttl !== undefined) setOpts.ttl = options.ttl;
  if (options?.tags !== undefined) setOpts.tags = options.tags;
  await cache.set(key, value, setOpts);
  return value;
}
