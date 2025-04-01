// Use the global TYPES from setup.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  initializeCache,
  shutdownCache,
} from "@/server/infrastructure/cache/startupHooks";
import { container } from "@/server/infrastructure/di";

const TYPES = (global as any).__TEST_TYPES__;

// Mock the container
vi.mock("@/server/infrastructure/di", () => ({
  container: {
    get: vi.fn(),
  },
}));

describe("Cache Startup Hooks", () => {
  let mockCacheService: {
    initialize: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock cache service
    mockCacheService = {
      initialize: vi.fn(),
      shutdown: vi.fn(),
    } as any;

    // Setup container mock
    (container.get as ReturnType<typeof vi.fn>).mockImplementation((type) => {
      if (type === TYPES.CacheService) {
        return mockCacheService;
      }
      return null;
    });
  });

  describe("initializeCache", () => {
    it("should initialize the cache service", async () => {
      // Call the function
      await initializeCache();

      // Verify container.get was called with correct type
      expect(container.get).toHaveBeenCalledWith(TYPES.CacheService);

      // Verify cache service initialize was called
      expect(mockCacheService.initialize).toHaveBeenCalled();
    });

    it("should handle errors during initialization", async () => {
      // Mock cache service to throw error
      mockCacheService.initialize.mockRejectedValue(
        new Error("Initialization failed"),
      );

      // Verify error is thrown
      await expect(initializeCache()).rejects.toThrow("Initialization failed");
    });
  });

  describe("shutdownCache", () => {
    it("should shutdown the cache service", async () => {
      // Call the function
      await shutdownCache();

      // Verify container.get was called with correct type
      expect(container.get).toHaveBeenCalledWith(TYPES.CacheService);

      // Verify cache service shutdown was called
      expect(mockCacheService.shutdown).toHaveBeenCalled();
    });

    it("should handle errors during shutdown", async () => {
      // Mock cache service to throw error
      mockCacheService.shutdown.mockRejectedValue(new Error("Shutdown failed"));

      // Verify error is thrown
      await expect(shutdownCache()).rejects.toThrow("Shutdown failed");
    });
  });
});
