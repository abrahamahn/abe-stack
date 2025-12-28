import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ResetCli } from "@/server/infrastructure/utils/reset/ResetCli";
import { ResetService } from "@/server/infrastructure/utils/reset/ResetService";

import type { Mock } from "vitest";

describe("ResetCli", () => {
  let resetCli: ResetCli;
  let consoleSpy: {
    log: Mock;
    error: Mock;
  };
  let resetServiceMock: {
    resetDatabase: Mock;
    resetUsers: Mock;
    resetConfig: Mock;
    resetCache: Mock;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.fn(),
      error: vi.fn(),
    };
    resetServiceMock = {
      resetDatabase: vi.fn().mockResolvedValue(undefined),
      resetUsers: vi.fn().mockResolvedValue(undefined),
      resetConfig: vi.fn().mockResolvedValue(undefined),
      resetCache: vi.fn().mockResolvedValue(undefined),
    };
    resetCli = new ResetCli();
    vi.spyOn(console, "log").mockImplementation(consoleSpy.log);
    vi.spyOn(console, "error").mockImplementation(consoleSpy.error);
    vi.spyOn(ResetService.prototype, "resetDatabase").mockImplementation(
      resetServiceMock.resetDatabase
    );
    vi.spyOn(ResetService.prototype, "resetUsers").mockImplementation(
      resetServiceMock.resetUsers
    );
    vi.spyOn(ResetService.prototype, "resetConfig").mockImplementation(
      resetServiceMock.resetConfig
    );
    vi.spyOn(ResetService.prototype, "resetCache").mockImplementation(
      resetServiceMock.resetCache
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("run", () => {
    it("should show help when no arguments provided", async () => {
      await resetCli.run([]);
      expect(consoleSpy.log).toHaveBeenCalledWith("Reset CLI Usage:");
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "  reset database   - Reset the database to its initial state"
      );
    });

    it("should handle database reset command", async () => {
      await resetCli.run(["database"]);
      expect(resetServiceMock.resetDatabase).toHaveBeenCalled();
    });

    it("should handle users reset command", async () => {
      await resetCli.run(["users"]);
      expect(resetServiceMock.resetUsers).toHaveBeenCalled();
    });

    it("should handle config reset command", async () => {
      await resetCli.run(["config"]);
      expect(resetServiceMock.resetConfig).toHaveBeenCalled();
    });

    it("should handle cache reset command", async () => {
      await resetCli.run(["cache"]);
      expect(resetServiceMock.resetCache).toHaveBeenCalled();
    });

    it("should handle all reset command", async () => {
      await resetCli.run(["all"]);
      expect(resetServiceMock.resetDatabase).toHaveBeenCalled();
      expect(resetServiceMock.resetUsers).toHaveBeenCalled();
      expect(resetServiceMock.resetConfig).toHaveBeenCalled();
      expect(resetServiceMock.resetCache).toHaveBeenCalled();
    });

    it("should show help for help command", async () => {
      await resetCli.run(["help"]);
      expect(consoleSpy.log).toHaveBeenCalledWith("Reset CLI Usage:");
    });

    it("should show error for unknown command", async () => {
      await resetCli.run(["unknown"]);
      expect(consoleSpy.error).toHaveBeenCalledWith("Unknown command: unknown");
      expect(consoleSpy.log).toHaveBeenCalledWith("Reset CLI Usage:");
    });

    it("should handle case-insensitive commands", async () => {
      await resetCli.run(["DATABASE"]);
      expect(resetServiceMock.resetDatabase).toHaveBeenCalled();
    });

    it("should handle alternative command names", async () => {
      await resetCli.run(["db"]);
      expect(resetServiceMock.resetDatabase).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle errors in database reset", async () => {
      const error = new Error("Database reset failed");
      resetServiceMock.resetDatabase.mockRejectedValueOnce(error);

      await expect(resetCli.run(["database"])).rejects.toThrow(error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error resetting database:",
        error.message
      );
    });

    it("should handle errors in users reset", async () => {
      const error = new Error("Users reset failed");
      resetServiceMock.resetUsers.mockRejectedValueOnce(error);

      await expect(resetCli.run(["users"])).rejects.toThrow(error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error resetting users:",
        error.message
      );
    });

    it("should handle errors in config reset", async () => {
      const error = new Error("Config reset failed");
      resetServiceMock.resetConfig.mockRejectedValueOnce(error);

      await expect(resetCli.run(["config"])).rejects.toThrow(error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error resetting config:",
        error.message
      );
    });

    it("should handle errors in cache reset", async () => {
      const error = new Error("Cache reset failed");
      resetServiceMock.resetCache.mockRejectedValueOnce(error);

      await expect(resetCli.run(["cache"])).rejects.toThrow(error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error resetting cache:",
        error.message
      );
    });

    it("should handle errors in all reset", async () => {
      const error = new Error("Database reset failed");
      resetServiceMock.resetDatabase.mockRejectedValueOnce(error);

      await expect(resetCli.run(["all"])).rejects.toThrow(error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error resetting all:",
        error.message
      );
    });
  });
});
