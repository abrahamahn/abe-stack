// sdk/src/storage/queryPersister.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearQueryCache, createQueryPersister } from './queryPersister';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockGetItem, mockSetItem, mockRemoveItem, mockClear, mockKeys } = vi.hoisted(() => ({
  mockGetItem: vi.fn<(key: string) => Promise<string | null>>(),
  mockSetItem: vi.fn<(key: string, value: string) => Promise<void>>(),
  mockRemoveItem: vi.fn<(key: string) => Promise<void>>(),
  mockClear: vi.fn<() => Promise<void>>(),
  mockKeys: vi.fn<() => Promise<string[]>>(),
}));

// Mock the storage module
vi.mock('./storage', () => ({
  idbStorage: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
    keys: mockKeys,
  },
  localStorageQueue: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('createQueryPersister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set default resolved values
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
    mockKeys.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('persistClient', () => {
    test('should throttle persistence writes', () => {
      const persister = createQueryPersister({ throttleTime: 500 });
      const mockClient = { timestamp: Date.now(), buster: '', clientState: {} };

      persister.persistClient(mockClient as never);
      persister.persistClient(mockClient as never);
      persister.persistClient(mockClient as never);

      // Should not have been called yet (throttled)
      expect(mockSetItem).not.toHaveBeenCalled();

      // Fast forward past throttle time
      vi.advanceTimersByTime(500);

      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });

    test('should use default key', () => {
      const persister = createQueryPersister();
      const mockClient = { timestamp: Date.now(), buster: '', clientState: {} };

      persister.persistClient(mockClient as never);
      vi.advanceTimersByTime(1000);

      expect(mockSetItem).toHaveBeenCalledWith('abe-stack-query-cache', expect.any(String));
    });

    test('should use custom key', () => {
      const persister = createQueryPersister({ key: 'custom-key' });
      const mockClient = { timestamp: Date.now(), buster: '', clientState: {} };

      persister.persistClient(mockClient as never);
      vi.advanceTimersByTime(1000);

      expect(mockSetItem).toHaveBeenCalledWith('custom-key', expect.any(String));
    });
  });

  describe('restoreClient', () => {
    test('should return undefined when no data', async () => {
      mockGetItem.mockResolvedValue(null);
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
    });

    test('should return parsed client data', async () => {
      const mockClient = { timestamp: Date.now(), buster: '', clientState: { queries: [] } };
      mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toEqual(mockClient);
    });

    test('should return undefined for expired data', async () => {
      const oldTimestamp = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago
      const mockClient = { timestamp: oldTimestamp, buster: '', clientState: {} };
      mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
      const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 }); // 24 hours

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
      expect(mockRemoveItem).toHaveBeenCalled();
    });

    test('should return undefined on parse error', async () => {
      mockGetItem.mockResolvedValue('invalid-json');
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
    });
  });

  describe('removeClient', () => {
    test('should remove from storage', async () => {
      const persister = createQueryPersister();

      await persister.removeClient();

      expect(mockRemoveItem).toHaveBeenCalledWith('abe-stack-query-cache');
    });

    test('should use custom key', async () => {
      const persister = createQueryPersister({ key: 'custom-key' });

      await persister.removeClient();

      expect(mockRemoveItem).toHaveBeenCalledWith('custom-key');
    });
  });
});

describe('clearQueryCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveItem.mockResolvedValue(undefined);
  });

  test('should remove default key', async () => {
    await clearQueryCache();
    expect(mockRemoveItem).toHaveBeenCalledWith('abe-stack-query-cache');
  });

  test('should remove custom key', async () => {
    await clearQueryCache('custom-key');
    expect(mockRemoveItem).toHaveBeenCalledWith('custom-key');
  });
});

describe('query expiration edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should return data at exactly maxAge boundary', async () => {
    const now = Date.now();
    const maxAge = 1000 * 60 * 60 * 24; // 24 hours
    const exactlyAtBoundary = now - maxAge; // Exactly 24 hours ago
    const mockClient = { timestamp: exactlyAtBoundary, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge });

    const result = await persister.restoreClient();

    // At exactly the boundary, data is still valid (comparison is strictly greater than)
    expect(result).toEqual(mockClient);
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  test('should return data 1ms before maxAge boundary', async () => {
    const now = Date.now();
    const maxAge = 1000 * 60 * 60 * 24; // 24 hours
    const justBeforeBoundary = now - maxAge + 1; // 1ms before expiry
    const mockClient = { timestamp: justBeforeBoundary, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge });

    const result = await persister.restoreClient();

    expect(result).toEqual(mockClient);
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  test('should handle zero maxAge (boundary case)', async () => {
    const now = Date.now();
    // With 0 maxAge and same timestamp, Date.now() - timestamp = 0, which is NOT > 0
    const mockClient = { timestamp: now, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge: 0 });

    const result = await persister.restoreClient();

    // Zero maxAge at exact same timestamp is still valid (0 is not > 0)
    expect(result).toEqual(mockClient);
  });

  test('should expire data when age exceeds maxAge', async () => {
    const now = Date.now();
    const maxAge = 1000; // 1 second
    const olderThanMaxAge = now - maxAge - 1; // 1ms older than maxAge
    const mockClient = { timestamp: olderThanMaxAge, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge });

    const result = await persister.restoreClient();

    expect(result).toBeUndefined();
    expect(mockRemoveItem).toHaveBeenCalled();
  });

  test('should handle very large maxAge', async () => {
    const now = Date.now();
    const oneYearAgo = now - 1000 * 60 * 60 * 24 * 365; // 1 year ago
    const mockClient = { timestamp: oneYearAgo, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({
      maxAge: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
    });

    const result = await persister.restoreClient();

    expect(result).toEqual(mockClient);
  });

  test('should handle future timestamp gracefully', async () => {
    const futureTimestamp = Date.now() + 1000 * 60 * 60; // 1 hour in the future
    const mockClient = { timestamp: futureTimestamp, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 });

    const result = await persister.restoreClient();

    // Future timestamps should be valid (clock skew scenario)
    expect(result).toEqual(mockClient);
  });

  test('should handle negative timestamp gracefully', async () => {
    const mockClient = { timestamp: -1000, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 });

    const result = await persister.restoreClient();

    // Negative timestamp would be very old, should be expired
    expect(result).toBeUndefined();
    expect(mockRemoveItem).toHaveBeenCalled();
  });

  test('should handle missing timestamp in stored data', async () => {
    const mockClient = { buster: '', clientState: {} }; // No timestamp
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 });

    const result = await persister.restoreClient();

    // Missing timestamp results in NaN comparison, which passes the > check as false
    // So the data is returned (this tests the actual implementation behavior)
    expect(result).toEqual(mockClient);
  });

  test('should handle storage error during restore', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));
    const persister = createQueryPersister();

    const result = await persister.restoreClient();

    expect(result).toBeUndefined();
  });

  test('should handle storage error during removal of expired data', async () => {
    const oldTimestamp = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago
    const mockClient = { timestamp: oldTimestamp, buster: '', clientState: {} };
    mockGetItem.mockResolvedValue(JSON.stringify(mockClient));
    mockRemoveItem.mockRejectedValue(new Error('Remove failed'));
    const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 }); // 24 hours

    // Should not throw even if remove fails
    const result = await persister.restoreClient();

    expect(result).toBeUndefined();
  });
});
