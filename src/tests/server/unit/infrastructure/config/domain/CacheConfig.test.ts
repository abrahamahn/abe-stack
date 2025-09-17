import { Container } from "inversify";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { IConfigService } from "@/server/infrastructure/config";
import {
  CacheConfigProvider,
  CacheProviderType,
} from "@/server/infrastructure/config/domain/CacheConfig";
import { TYPES } from "@/server/infrastructure/di/types";

describe("CacheConfigProvider", () => {
  let cacheConfigProvider: CacheConfigProvider;
  let mockConfigService: IConfigService;
  let container: Container;

  beforeEach(() => {
    // Create mocks
    mockConfigService = {
      get: vi.fn(),
      getString: vi.fn(),
      getNumber: vi.fn(),
      getBoolean: vi.fn(),
      getWithDefault: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      getAll: vi.fn(),
    } as unknown as IConfigService;

    // Set up container
    container = new Container();
    container.bind(TYPES.ConfigService).toConstantValue(mockConfigService);
    container.bind(CacheConfigProvider).toSelf();

    // Get instance
    cacheConfigProvider = container.get(CacheConfigProvider);
  });

  describe("getConfig", () => {
    it("should return memory provider config with defaults when no config is provided", () => {
      // Arrange
      vi.mocked(mockConfigService.getWithDefault).mockImplementation(
        (key, defaultValue) => {
          if (key === "cache.provider") return CacheProviderType.MEMORY;
          if (key === "cache.cleanupInterval") return 10;
          return defaultValue;
        }
      );

      // Act
      const config = cacheConfigProvider.getConfig();

      // Assert
      expect(config).toEqual({
        provider: CacheProviderType.MEMORY,
        cleanupInterval: 10,
      });

      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.provider",
        CacheProviderType.MEMORY
      );

      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.cleanupInterval",
        10
      );
    });

    it("should return memory provider with custom cleanup interval", () => {
      // Arrange
      vi.mocked(mockConfigService.getWithDefault).mockImplementation(
        (key, defaultValue) => {
          if (key === "cache.provider") return CacheProviderType.MEMORY;
          if (key === "cache.cleanupInterval") return 30;
          return defaultValue;
        }
      );

      // Act
      const config = cacheConfigProvider.getConfig();

      // Assert
      expect(config).toEqual({
        provider: CacheProviderType.MEMORY,
        cleanupInterval: 30,
      });
    });

    it("should return redis provider config with defaults when redis provider is specified", () => {
      // Arrange
      vi.mocked(mockConfigService.getWithDefault).mockImplementation(
        (key, defaultValue) => {
          if (key === "cache.provider") return CacheProviderType.REDIS;
          if (key === "cache.cleanupInterval") return 10;
          if (key === "cache.redis.host") return "localhost";
          if (key === "cache.redis.port") return 6379;
          if (key === "cache.redis.db") return 0;
          if (key === "cache.redis.keyPrefix") return "cache:";
          return defaultValue;
        }
      );

      // Return null for password to simulate undefined
      vi.mocked(mockConfigService.getString).mockReturnValue(
        null as unknown as string
      );
      vi.mocked(mockConfigService.getBoolean).mockReturnValue(false);

      // Act
      const config = cacheConfigProvider.getConfig();

      // Assert
      expect(config).toEqual({
        provider: CacheProviderType.REDIS,
        cleanupInterval: 10,
        redis: {
          host: "localhost",
          port: 6379,
          db: 0,
          keyPrefix: "cache:",
          password: null, // null instead of undefined in test
          tls: false,
        },
      });

      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.redis.host",
        "localhost"
      );
      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.redis.port",
        6379
      );
      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.redis.db",
        0
      );
      expect(mockConfigService.getWithDefault).toHaveBeenCalledWith(
        "cache.redis.keyPrefix",
        "cache:"
      );
      expect(mockConfigService.getString).toHaveBeenCalledWith(
        "cache.redis.password",
        undefined
      );
      expect(mockConfigService.getBoolean).toHaveBeenCalledWith(
        "cache.redis.tls",
        false
      );
    });

    it("should return redis provider with custom config values", () => {
      // Arrange
      vi.mocked(mockConfigService.getWithDefault).mockImplementation(
        (key, defaultValue) => {
          if (key === "cache.provider") return CacheProviderType.REDIS;
          if (key === "cache.cleanupInterval") return 20;
          if (key === "cache.redis.host") return "redis.example.com";
          if (key === "cache.redis.port") return 6380;
          if (key === "cache.redis.db") return 2;
          if (key === "cache.redis.keyPrefix") return "app:cache:";
          return defaultValue;
        }
      );

      vi.mocked(mockConfigService.getString).mockReturnValue("password123");
      vi.mocked(mockConfigService.getBoolean).mockReturnValue(true);

      // Act
      const config = cacheConfigProvider.getConfig();

      // Assert
      expect(config).toEqual({
        provider: CacheProviderType.REDIS,
        cleanupInterval: 20,
        redis: {
          host: "redis.example.com",
          port: 6380,
          db: 2,
          keyPrefix: "app:cache:",
          password: "password123",
          tls: true,
        },
      });
    });
  });
});
