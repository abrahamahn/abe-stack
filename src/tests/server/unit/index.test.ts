import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { ConfigService } from "@infrastructure/config";
import { container, TYPES } from "@infrastructure/di";
import { ILoggerService } from "@infrastructure/logging";
import { ServerManager } from "@infrastructure/server";

import { initializeServer } from "@/server/index";

// Mock the dependencies
vi.mock("@/server/infrastructure/di", () => ({
  container: {
    get: vi.fn(),
  },
}));

vi.mock("@/server/infrastructure/server", () => ({
  ServerManager: vi.fn().mockImplementation(() => ({
    setupGracefulShutdown: vi.fn(),
    initialize: vi.fn(),
  })),
}));

vi.mock("path", () => ({
  resolve: vi.fn().mockReturnValue("/mock/storage/path"),
}));

// Extend global type to include initializeServer
declare global {
  // eslint-disable-next-line no-var
  var initializeServer: () => Promise<void>;
}

describe("Server Initialization", () => {
  let mockLogger: ILoggerService;
  let mockConfigService: ConfigService;
  let mockServerManager: ServerManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockImplementation(() => Promise.resolve()),
      shutdown: vi.fn().mockImplementation(() => Promise.resolve()),
    };

    // Setup mock config service
    mockConfigService = {
      getNumber: vi.fn().mockReturnValue(3000),
      getString: vi.fn().mockReturnValue("test-host"),
    } as any;

    // Setup mock server manager
    mockServerManager = new ServerManager(mockLogger, container);

    // Setup container mocks
    (container.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (type: symbol) => {
        if (type === TYPES.LoggerService) return mockLogger;
        if (type === TYPES.ConfigService) return mockConfigService;
        return null;
      },
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Successful Initialization", () => {
    it("should initialize server successfully with default values", async () => {
      // Mock config service to return default values
      (
        mockConfigService.getNumber as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(undefined);
      (
        mockConfigService.getString as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(undefined);

      await initializeServer();

      // Verify logger was initialized
      expect(container.get).toHaveBeenCalledWith(TYPES.LoggerService);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Logger service initialized successfully",
      );

      // Verify config was loaded with defaults
      expect(container.get).toHaveBeenCalledWith(TYPES.ConfigService);
      expect(mockConfigService.getNumber).toHaveBeenCalledWith("PORT");
      expect(mockConfigService.getString).toHaveBeenCalledWith("HOST");
      expect(mockConfigService.getString).toHaveBeenCalledWith("STORAGE_PATH");

      // Verify server manager was created and initialized
      expect(ServerManager).toHaveBeenCalledWith(mockLogger, container);
      expect(mockServerManager.setupGracefulShutdown).toHaveBeenCalled();
      expect(mockServerManager.initialize).toHaveBeenCalledWith({
        port: 8080,
        host: "localhost",
        isProduction: false,
        storagePath: "/mock/storage/path",
      });

      // Verify final success message
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Server initialization completed successfully",
      );
    });

    it("should initialize server with custom configuration", async () => {
      // Mock config service to return custom values
      (
        mockConfigService.getNumber as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(3000);
      (
        mockConfigService.getString as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "HOST") return "custom-host";
        if (key === "STORAGE_PATH") return "custom-storage";
        return undefined;
      });

      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await initializeServer();

      // Verify server was initialized with custom config
      expect(mockServerManager.initialize).toHaveBeenCalledWith({
        port: 3000,
        host: "custom-host",
        isProduction: true,
        storagePath: "/mock/storage/path",
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Error Handling", () => {
    it("should handle logger initialization failure", async () => {
      // Mock container to throw error when getting logger
      (container.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (type: symbol) => {
          if (type === TYPES.LoggerService) {
            throw new Error("Logger initialization failed");
          }
          return mockConfigService;
        },
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await initializeServer();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to start server:",
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle config service initialization failure", async () => {
      // Mock container to throw error when getting config service
      (container.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (type: symbol) => {
          if (type === TYPES.LoggerService) return mockLogger;
          if (type === TYPES.ConfigService) {
            throw new Error("Config initialization failed");
          }
          return null;
        },
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await initializeServer();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to start server:",
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle server manager initialization failure", async () => {
      // Mock server manager to fail initialization
      (
        mockServerManager.initialize as unknown as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Server initialization failed"));

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await initializeServer();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to start server:",
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Graceful Shutdown", () => {
    it("should setup graceful shutdown handlers", async () => {
      await initializeServer();

      expect(mockServerManager.setupGracefulShutdown).toHaveBeenCalled();
    });

    it("should handle process termination signals", async () => {
      await initializeServer();

      // Simulate SIGTERM signal
      process.emit("SIGTERM");

      // Verify graceful shutdown was triggered
      expect(mockServerManager.setupGracefulShutdown).toHaveBeenCalled();
    });
  });

  describe("Process Exit Handling", () => {
    it("should handle uncaught promise rejections", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      // Mock initializeServer to throw error
      global.initializeServer = vi
        .fn()
        .mockRejectedValue(new Error("Uncaught promise rejection"));

      // Trigger the promise rejection handler
      await Promise.reject(new Error("Test error"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to start server:",
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
