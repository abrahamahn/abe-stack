// packages/sdk/src/persistence/__tests__/queryPersister.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearQueryCache, createQueryPersister } from '@persistence/queryPersister';
import { idbStorage } from '@persistence/storage';

// Mock idbStorage
vi.mock('@persistence/storage', () => ({
  idbStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

const mockIdbStorage = vi.mocked(idbStorage);

describe('createQueryPersister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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
      expect(mockIdbStorage.setItem).not.toHaveBeenCalled();

      // Fast forward past throttle time
      vi.advanceTimersByTime(500);

      expect(mockIdbStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should use default key', () => {
      const persister = createQueryPersister();
      const mockClient = { timestamp: Date.now(), buster: '', clientState: {} };

      persister.persistClient(mockClient as never);
      vi.advanceTimersByTime(1000);

      expect(mockIdbStorage.setItem).toHaveBeenCalledWith(
        'abe-stack-query-cache',
        expect.any(String),
      );
    });

    test('should use custom key', () => {
      const persister = createQueryPersister({ key: 'custom-key' });
      const mockClient = { timestamp: Date.now(), buster: '', clientState: {} };

      persister.persistClient(mockClient as never);
      vi.advanceTimersByTime(1000);

      expect(mockIdbStorage.setItem).toHaveBeenCalledWith('custom-key', expect.any(String));
    });
  });

  describe('restoreClient', () => {
    test('should return undefined when no data', async () => {
      mockIdbStorage.getItem.mockResolvedValue(null);
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
    });

    test('should return parsed client data', async () => {
      const mockClient = { timestamp: Date.now(), buster: '', clientState: { queries: [] } };
      mockIdbStorage.getItem.mockResolvedValue(JSON.stringify(mockClient));
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toEqual(mockClient);
    });

    test('should return undefined for expired data', async () => {
      const oldTimestamp = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago
      const mockClient = { timestamp: oldTimestamp, buster: '', clientState: {} };
      mockIdbStorage.getItem.mockResolvedValue(JSON.stringify(mockClient));
      const persister = createQueryPersister({ maxAge: 1000 * 60 * 60 * 24 }); // 24 hours

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
      expect(mockIdbStorage.removeItem).toHaveBeenCalled();
    });

    test('should return undefined on parse error', async () => {
      mockIdbStorage.getItem.mockResolvedValue('invalid-json');
      const persister = createQueryPersister();

      const result = await persister.restoreClient();

      expect(result).toBeUndefined();
    });
  });

  describe('removeClient', () => {
    test('should remove from storage', async () => {
      const persister = createQueryPersister();

      await persister.removeClient();

      expect(mockIdbStorage.removeItem).toHaveBeenCalledWith('abe-stack-query-cache');
    });

    test('should use custom key', async () => {
      const persister = createQueryPersister({ key: 'custom-key' });

      await persister.removeClient();

      expect(mockIdbStorage.removeItem).toHaveBeenCalledWith('custom-key');
    });
  });
});

describe('clearQueryCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should remove default key', async () => {
    await clearQueryCache();
    expect(mockIdbStorage.removeItem).toHaveBeenCalledWith('abe-stack-query-cache');
  });

  test('should remove custom key', async () => {
    await clearQueryCache('custom-key');
    expect(mockIdbStorage.removeItem).toHaveBeenCalledWith('custom-key');
  });
});
