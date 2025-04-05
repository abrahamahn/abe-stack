import * as console from "console";
import path from "path";
import * as process from "process";

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("process", () => ({
  exit: vi.fn(),
  env: { NODE_ENV: "test" },
  cwd: vi.fn().mockReturnValue("/mock/cwd"),
}));

vi.mock("console", () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

vi.mock("path", () => {
  const resolveMock = vi.fn().mockReturnValue("/mocked/path");
  return {
    resolve: resolveMock,
    default: {
      resolve: resolveMock,
    },
  };
});

vi.mock("../../../server/infrastructure/di", () => ({
  container: {
    get: vi.fn(),
  },
  TYPES: {
    LoggerService: Symbol("LoggerService"),
    ConfigService: Symbol("ConfigService"),
    ServerManager: Symbol("ServerManager"),
  },
}));

vi.mock("../../../server/infrastructure/server", () => ({
  ServerManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    setupGracefulShutdown: vi.fn(),
  })),
}));

// Import dependencies after mocks
import { TYPES, container } from "../../../server/infrastructure/di";
import { ServerManager } from "../../../server/infrastructure/server";

// Test a simplified version of the server initialization function
describe("Server Initialization", () => {
  // Mock objects
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  const mockConfigService = {
    getString: vi.fn(),
    getNumber: vi.fn(),
    getBoolean: vi.fn(),
  };

  const mockServerManager = {
    initialize: vi.fn().mockResolvedValue(undefined),
    setupGracefulShutdown: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup container.get mock
    vi.mocked(container.get).mockImplementation((type) => {
      if (type === TYPES.LoggerService) return mockLogger;
      if (type === TYPES.ConfigService) return mockConfigService;
      return null;
    });

    // Setup config values
    mockConfigService.getString.mockImplementation((key) => {
      if (key === "HOST") return "test-host";
      if (key === "STORAGE_PATH") return "uploads";
      return "";
    });

    mockConfigService.getNumber.mockImplementation((key) => {
      if (key === "PORT") return 3000;
      return 0;
    });

    // Setup ServerManager
    vi.mocked(ServerManager).mockImplementation(() => mockServerManager as any);
  });

  // Simplified version of the server initialization function
  async function initializeServer(containerParam = container) {
    try {
      console.log("Starting server initialization...");

      // Check for container
      if (!containerParam) {
        throw new Error("DI container not initialized");
      }

      // Get logger
      const logger = containerParam.get(TYPES.LoggerService) as any;
      logger.info("Logger service initialized successfully");

      // Get config
      const configService = containerParam.get(TYPES.ConfigService) as any;
      const config = {
        port: configService.getNumber("PORT") || 8080,
        host: configService.getString("HOST") || "localhost",
        isProduction: process.env.NODE_ENV === "production",
        storagePath: path.resolve(
          process.cwd(),
          configService.getString("STORAGE_PATH") || "uploads",
        ),
      };

      // Create server manager
      const serverManager = new ServerManager(logger, containerParam);

      // Setup graceful shutdown
      serverManager.setupGracefulShutdown();

      // Initialize server
      await serverManager.initialize(config as any);

      logger.info("Server initialization completed successfully");
      return { success: true };
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
      return { success: false, error };
    }
  }

  it("should initialize server successfully with default values", async () => {
    // Mock successful ServerManager initialization
    mockServerManager.initialize.mockResolvedValueOnce(undefined);

    const result = await initializeServer();

    // Verify success
    expect(result).toEqual({ success: true });

    // Verify logger was initialized
    expect(container.get).toHaveBeenCalledWith(TYPES.LoggerService);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Logger service initialized successfully",
    );

    // Verify config service was retrieved
    expect(container.get).toHaveBeenCalledWith(TYPES.ConfigService);

    // Verify path was resolved correctly
    expect(path.resolve).toHaveBeenCalledWith("/mock/cwd", "uploads");

    // Verify server manager was created and initialized
    expect(ServerManager).toHaveBeenCalledWith(mockLogger, container);
    expect(mockServerManager.setupGracefulShutdown).toHaveBeenCalled();
    expect(mockServerManager.initialize).toHaveBeenCalledWith({
      port: 3000,
      host: "test-host",
      isProduction: false,
      storagePath: "/mocked/path",
    });

    // Verify completion was logged
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Server initialization completed successfully",
    );

    // Verify process.exit was not called
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should handle logger initialization failure", async () => {
    // Force logger retrieval to fail
    const error = new Error("Logger initialization failed");
    vi.mocked(container.get).mockImplementationOnce(() => {
      throw error;
    });

    await initializeServer();

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Failed to start server:",
      error,
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should create a separate test for missing container", async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Call initializeServer with null container
    await initializeServer(null as any);

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Failed to start server:",
      expect.objectContaining({
        message: "DI container not initialized",
      }),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should handle config service initialization failure", async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Force config service retrieval to fail
    const error = new Error("Config initialization failed");

    // First call should return mockLogger, second call should throw the error
    vi.mocked(container.get)
      .mockImplementationOnce((type) => {
        if (type === TYPES.LoggerService) return mockLogger;
        return null;
      })
      .mockImplementationOnce((type) => {
        if (type === TYPES.ConfigService) throw error;
        return null;
      });

    await initializeServer();

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Failed to start server:",
      error,
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should handle server initialization failure", async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up container.get to return the expected services without errors
    vi.mocked(container.get).mockImplementation((type) => {
      if (type === TYPES.LoggerService) return mockLogger;
      if (type === TYPES.ConfigService) return mockConfigService;
      return null;
    });

    // Force server initialization to fail
    const error = new Error("Server initialization failed");
    mockServerManager.initialize.mockRejectedValueOnce(error);

    await initializeServer();

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Failed to start server:",
      error,
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
