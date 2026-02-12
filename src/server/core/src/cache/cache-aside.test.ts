// src/server/core/src/cache/cache-aside.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheAside } from './cache-aside';

import type { CacheProvider, CacheSetOptions } from '@abe-stack/shared';

// ============================================================================
// Test Helpers
// ============================================================================

type MockCacheProvider = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

function createMockCache(): MockCacheProvider {
  return {
    get: vi.fn(),
    set: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('cacheAside', () => {
  let mockCache: MockCacheProvider;

  beforeEach(() => {
    mockCache = createMockCache();
  });

  it('calls loader and caches value on cache miss', async () => {
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue({ id: '1', name: 'Alice' });

    const result = await cacheAside(mockCache as unknown as CacheProvider, 'user:1', loader, {
      ttl: 300_000,
      tags: ['user:1'],
    });

    expect(result).toEqual({ id: '1', name: 'Alice' });
    expect(mockCache.get).toHaveBeenCalledWith('user:1');
    expect(loader).toHaveBeenCalledOnce();
    expect(mockCache.set).toHaveBeenCalledWith('user:1', { id: '1', name: 'Alice' }, {
      ttl: 300_000,
      tags: ['user:1'],
    } satisfies CacheSetOptions);
  });

  it('returns cached value without calling loader on cache hit', async () => {
    mockCache.get.mockResolvedValue({ id: '1', name: 'Alice' });
    const loader = vi.fn();

    const result = await cacheAside(mockCache as unknown as CacheProvider, 'user:1', loader);

    expect(result).toEqual({ id: '1', name: 'Alice' });
    expect(mockCache.get).toHaveBeenCalledWith('user:1');
    expect(loader).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('passes ttl and tags to cache.set correctly', async () => {
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue(['flag-a', 'flag-b']);

    await cacheAside(mockCache as unknown as CacheProvider, 'flags:tenant-1', loader, {
      ttl: 60_000,
      tags: ['feature-flags'],
    });

    expect(mockCache.set).toHaveBeenCalledWith('flags:tenant-1', ['flag-a', 'flag-b'], {
      ttl: 60_000,
      tags: ['feature-flags'],
    } satisfies CacheSetOptions);
  });

  it('does not cache undefined loader result', async () => {
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue(undefined);

    const result = await cacheAside(mockCache as unknown as CacheProvider, 'user:missing', loader);

    expect(result).toBeUndefined();
    expect(loader).toHaveBeenCalledOnce();
    expect(mockCache.set).toHaveBeenCalledWith('user:missing', undefined, {});
  });

  it('works without options parameter', async () => {
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue('value');

    const result = await cacheAside(mockCache as unknown as CacheProvider, 'key', loader);

    expect(result).toBe('value');
    expect(mockCache.set).toHaveBeenCalledWith('key', 'value', {
      ttl: undefined,
      tags: undefined,
    });
  });
});
