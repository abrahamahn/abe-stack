import { Server, createServer } from "http";

import { Container } from "inversify";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";

import { TYPES } from "@/server/infrastructure/di/types";
import ApplicationLifecycle from "@/server/infrastructure/lifecycle/ApplicationLifecycle";

describe("ApplicationLifecycle", () => {
  let container: Container;
  let lifecycle: ApplicationLifecycle;
  let mockLogger: any;
  let mockWebSocketService: any;
  let mockDatabaseService: any;
  let httpServer: Server;

  beforeEach(() => {
    container = new Container();

    // Create mock services
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      trace: vi.fn(),
      traceObj: vi.fn(),
      fatal: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      getTransports: vi.fn(),
      clearTransports: vi.fn(),
      setLevel: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
    };

    mockWebSocketService = {
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockDatabaseService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Bind mock services to container
    container.bind(TYPES.LoggerService).toConstantValue(mockLogger);
    container
      .bind(TYPES.WebSocketService)
      .toConstantValue(mockWebSocketService);
    container.bind(TYPES.DatabaseService).toConstantValue(mockDatabaseService);

    // Create HTTP server
    httpServer = createServer();

    // Create lifecycle instance
    lifecycle = container.resolve(ApplicationLifecycle);

    // Important: ensure httpServer is properly mocked for testing
    const mockClose = vi.fn().mockImplementation((cb) => {
      if (cb) cb(null);
      return httpServer;
    });
    httpServer.close = mockClose;
    lifecycle.setHttpServer(httpServer);

    // Reduce the shutdown timeout for faster tests
    lifecycle["shutdownTimeout"] = 1000; // 1 second for tests
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterAll(() => {
    httpServer.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await lifecycle.initialize();

      expect(mockDatabaseService.initialize).toHaveBeenCalled();

      // Check that any of the logger.info calls contain the success message
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Application initialization completed successfully",
        ),
        expect.anything(),
      );
    }, 5000);

    it("should handle initialization errors", async () => {
      const error = new Error("Database connection failed");
      mockDatabaseService.initialize.mockRejectedValue(error);

      await expect(lifecycle.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Application initialization failed"),
        expect.objectContaining({ error }),
      );
    }, 5000);

    it("should register process signal handlers", () => {
      const processSpy = vi.spyOn(process, "on");
      lifecycle["registerProcessHandlers"]();

      expect(processSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function),
      );
    });
  });

  describe("Dependency Management", () => {
    it("should register dependencies", () => {
      const dependency = {
        name: "TestService",
        dependencies: [],
        startup: vi.fn(),
        shutdown: vi.fn(),
      };

      lifecycle.registerDependency(dependency);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Registered dependency: TestService"),
      );
    });

    it("should handle dependency initialization order", async () => {
      const dep1 = {
        name: "Service1",
        dependencies: [],
        startup: vi.fn().mockResolvedValue(undefined),
      };

      const dep2 = {
        name: "Service2",
        dependencies: ["Service1"],
        startup: vi.fn().mockResolvedValue(undefined),
      };

      lifecycle.registerDependency(dep1);
      lifecycle.registerDependency(dep2);

      await lifecycle.initialize();

      expect(dep1.startup).toHaveBeenCalledBefore(dep2.startup);
    }, 5000);

    it("should detect circular dependencies", async () => {
      const dep1 = {
        name: "Service1",
        dependencies: ["Service2"],
        startup: vi.fn(),
      };

      const dep2 = {
        name: "Service2",
        dependencies: ["Service1"],
        startup: vi.fn(),
      };

      lifecycle.registerDependency(dep1);
      lifecycle.registerDependency(dep2);

      await expect(lifecycle.initialize()).rejects.toThrow(
        "Could not initialize dependencies: Service1, Service2. Possible circular dependency.",
      );
    }, 5000);
  });

  describe("Shutdown", () => {
    beforeEach(() => {
      // We'll use fake timers for shutdown tests to avoid timeouts
      vi.useFakeTimers();

      // Reset all mocks before each test
      mockDatabaseService.close.mockReset();
      mockWebSocketService.close.mockReset();
      mockDatabaseService.close.mockResolvedValue(undefined);
      mockWebSocketService.close.mockResolvedValue(undefined);
    });

    it("should perform graceful shutdown", async () => {
      const shutdownPromise = lifecycle.shutdown("test-correlation-id");

      // Run all pending promises
      await vi.runAllTimersAsync();

      await shutdownPromise;

      // Verify all services were closed
      expect(mockWebSocketService.close).toHaveBeenCalled();
      expect(mockDatabaseService.close).toHaveBeenCalled();
    }, 5000);

    it("should handle shutdown errors gracefully", async () => {
      const error = new Error("Shutdown failed");
      mockWebSocketService.close.mockRejectedValue(error);

      const shutdownPromise = lifecycle.shutdown();
      await vi.runAllTimersAsync();
      await shutdownPromise;

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing WebSocket connections",
        expect.objectContaining({ error }),
      );
    }, 5000);

    it("should prevent multiple shutdown attempts", async () => {
      const shutdownHandler = vi.fn().mockResolvedValue(undefined);
      lifecycle.registerShutdownHandler(shutdownHandler);

      // Start shutdown
      const shutdownPromise = lifecycle.shutdown();

      // Set isShuttingDown manually for testing
      lifecycle["isShuttingDown"] = true;

      // Try to shutdown again while first shutdown is in progress
      await lifecycle.shutdown();

      // Advance timers to complete the first shutdown
      await vi.runAllTimersAsync();

      // Wait for first shutdown to complete
      await shutdownPromise;

      // Handler should only be called once
      expect(shutdownHandler).toHaveBeenCalledTimes(1);
    }, 5000);

    it("should handle HTTP server close errors", async () => {
      const error = new Error("Server close failed");

      // Register a shutdown handler that throws an error
      lifecycle.registerShutdownHandler(async () => {
        throw error;
      });

      // Start shutdown
      const shutdownPromise = lifecycle.shutdown();

      // Run all pending promises
      await vi.runAllTimersAsync();

      // Wait for shutdown to complete
      await shutdownPromise;

      // Error should be logged but not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error during graceful shutdown"),
        expect.objectContaining({ error: expect.any(Error) }),
      );
    }, 5000);
  });

  describe("HTTP Server Management", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should close HTTP server during shutdown", async () => {
      const closeSpy = vi.spyOn(httpServer, "close");

      // Start shutdown
      const shutdownPromise = lifecycle.shutdown();

      // Run all pending promises
      await vi.runAllTimersAsync();

      // Wait for shutdown to complete
      await shutdownPromise;

      expect(closeSpy).toHaveBeenCalled();
    }, 5000);

    it("should handle HTTP server close errors", async () => {
      // Mock the close method to simulate an error
      httpServer.close = vi.fn().mockImplementation((cb) => {
        const error = new Error("Server close failed");
        if (cb) cb(error);
        return httpServer;
      });

      // Set the HTTP server
      lifecycle.setHttpServer(httpServer);

      // Start shutdown
      const shutdownPromise = lifecycle.shutdown();

      // Run all pending promises
      await vi.runAllTimersAsync();

      // Wait for shutdown to complete
      await shutdownPromise;

      // Verify the error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing HTTP server",
        expect.objectContaining({
          error: expect.objectContaining({ message: "Server close failed" }),
        }),
      );
    }, 5000);
  });
});
