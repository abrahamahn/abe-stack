import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CacheService } from "@/server/infrastructure/cache/CacheService";
import { ConfigService } from "@/server/infrastructure/config/ConfigService";
import { DatabaseServer } from "@/server/infrastructure/database/DatabaseServer";
import { ILoggerService } from "@/server/infrastructure/logging/ILoggerService";
import { ResetService } from "@/server/infrastructure/utils/reset/ResetService";

describe("ResetService", () => {
  let resetService: ResetService;
  let loggerMock: ILoggerService;
  let databaseServerMock: DatabaseServer;
  let configServiceMock: ConfigService;
  let cacheServiceMock: CacheService;

  beforeEach(() => {
    // Create mock implementations
    loggerMock = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      infoObj: vi.fn(),
      errorObj: vi.fn(),
      warnObj: vi.fn(),
      debugObj: vi.fn(),
      setLogLevel: vi.fn(),
      getLogLevel: vi.fn(),
      isDebugEnabled: vi.fn(),
      isInfoEnabled: vi.fn(),
      isWarnEnabled: vi.fn(),
      isErrorEnabled: vi.fn(),
    } as unknown as ILoggerService;

    databaseServerMock = {
      reset: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn(),
      getConnection: vi.fn(),
    } as unknown as DatabaseServer;

    configServiceMock = {
      reset: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
    } as unknown as ConfigService;

    cacheServiceMock = {
      clear: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
      size: vi.fn(),
    } as unknown as CacheService;

    resetService = new ResetService(
      loggerMock,
      databaseServerMock,
      configServiceMock,
      cacheServiceMock
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resetDatabase", () => {
    it("should log database reset operation", async () => {
      await resetService.resetDatabase();
      expect(loggerMock.info).toHaveBeenCalledWith("Resetting database...");
      expect(databaseServerMock.reset).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith("Database reset complete");
    });

    it("should not throw errors during reset", async () => {
      await expect(resetService.resetDatabase()).resolves.not.toThrow();
    });
  });

  describe("resetUsers", () => {
    it("should log user data reset operation", async () => {
      await resetService.resetUsers();
      expect(loggerMock.info).toHaveBeenCalledWith("Resetting user data...");
      expect(databaseServerMock.query).toHaveBeenCalledWith(
        "DELETE FROM users"
      );
      expect(loggerMock.info).toHaveBeenCalledWith("User data reset complete");
    });

    it("should not throw errors during reset", async () => {
      await expect(resetService.resetUsers()).resolves.not.toThrow();
    });
  });

  describe("resetConfig", () => {
    it("should log configuration reset operation", async () => {
      await resetService.resetConfig();
      expect(loggerMock.info).toHaveBeenCalledWith(
        "Resetting configuration..."
      );
      expect(configServiceMock.reset).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith(
        "Configuration reset complete"
      );
    });

    it("should not throw errors during reset", async () => {
      await expect(resetService.resetConfig()).resolves.not.toThrow();
    });
  });

  describe("resetCache", () => {
    it("should log cache reset operation", async () => {
      await resetService.resetCache();
      expect(loggerMock.info).toHaveBeenCalledWith("Clearing cache...");
      expect(cacheServiceMock.clear).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith("Cache reset complete");
    });

    it("should not throw errors during reset", async () => {
      await expect(resetService.resetCache()).resolves.not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully in resetDatabase", async () => {
      const error = new Error("Database reset failed");
      (databaseServerMock.reset as any).mockRejectedValueOnce(error);

      await expect(resetService.resetDatabase()).resolves.not.toThrow();
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Error resetting database:",
        { error }
      );
    });

    it("should handle errors gracefully in resetUsers", async () => {
      const error = new Error("User reset failed");
      (databaseServerMock.query as any).mockRejectedValueOnce(error);

      await expect(resetService.resetUsers()).resolves.not.toThrow();
      expect(loggerMock.error).toHaveBeenCalledWith("Error resetting users:", {
        error,
      });
    });

    it("should handle errors gracefully in resetConfig", async () => {
      const error = new Error("Config reset failed");
      (configServiceMock.reset as any).mockRejectedValueOnce(error);

      await expect(resetService.resetConfig()).resolves.not.toThrow();
      expect(loggerMock.error).toHaveBeenCalledWith("Error resetting config:", {
        error,
      });
    });

    it("should handle errors gracefully in resetCache", async () => {
      const error = new Error("Cache reset failed");
      (cacheServiceMock.clear as any).mockRejectedValueOnce(error);

      await expect(resetService.resetCache()).resolves.not.toThrow();
      expect(loggerMock.error).toHaveBeenCalledWith("Error resetting cache:", {
        error,
      });
    });
  });
});
