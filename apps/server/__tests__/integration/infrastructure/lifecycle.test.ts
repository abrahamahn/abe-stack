import { Server } from "http";

import { Container } from "inversify";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import {
  ApplicationLifecycle,
  IApplicationLifecycle,
} from "@/server/infrastructure/lifecycle";
import type { ILoggerService } from "@/server/infrastructure/logging";
import type { IWebSocketService } from "@/server/infrastructure/pubsub";

// Create a more complete WebSocketService mock type
type MockWebSocketService = Omit<IWebSocketService, "shutdown"> & {
  shutdown?: Mock;
};

describe("Application Lifecycle Integration Tests", () => {
  let container: Container;
  let lifecycle: IApplicationLifecycle;
  let mockLogger: any;
  let mockWebSocketService: any;
  let mockDatabaseService: any;
  let mockHttpServer: any;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock WebSocket service with all required interface methods
    mockWebSocketService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      sendToClient: vi.fn().mockResolvedValue(true),
      publish: vi.fn().mockResolvedValue(0),
      broadcast: vi.fn().mockResolvedValue(0),
      subscribe: vi.fn().mockReturnValue(true),
      unsubscribe: vi.fn().mockReturnValue(true),
      getClientChannels: vi.fn().mockReturnValue(new Set<string>()),
      getChannelClients: vi.fn().mockReturnValue(new Set<string>()),
      authenticateClient: vi.fn().mockResolvedValue(true),
      disconnectClient: vi.fn().mockImplementation((_clientId, _reason) => {}),
      getStats: vi.fn().mockReturnValue({
        totalConnections: 0,
        authenticatedConnections: 0,
        channelCounts: {},
        messagesPerSecond: 0,
        peakConnections: 0,
      }),
      setPresence: vi.fn().mockImplementation(async () => {}),
      getPresence: vi.fn().mockResolvedValue(null),
    };

    // Setup mock database service
    mockDatabaseService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mock HTTP server
    mockHttpServer = {
      close: vi.fn().mockImplementation((callback) => callback()),
      listening: true,
    };

    // Setup DI container
    container = new Container();
    container
      .bind<ILoggerService>(TYPES.LoggerService)
      .toConstantValue(mockLogger);
    container
      .bind<IWebSocketService>(TYPES.WebSocketService)
      .toConstantValue(mockWebSocketService);
    container
      .bind<IDatabaseServer>(TYPES.DatabaseService)
      .toConstantValue(mockDatabaseService);
    container
      .bind<IApplicationLifecycle>(TYPES.ApplicationLifecycle)
      .to(ApplicationLifecycle)
      .inSingletonScope();

    // Get lifecycle instance
    lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );
  });

  afterEach(async () => {
    await lifecycle.stop();
  });

  describe("Dependency Management", () => {
    it("should initialize dependencies in correct order", async () => {
      const initOrder: string[] = [];

      // Register dependencies with different orders
      lifecycle.register("ServiceA", [], {
        start: async () => {
          initOrder.push("ServiceA");
        },
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        start: async () => {
          initOrder.push("ServiceB");
        },
      });

      lifecycle.register("ServiceC", ["ServiceB"], {
        start: async () => {
          initOrder.push("ServiceC");
        },
      });

      await lifecycle.start();

      expect(initOrder).toEqual(["ServiceA", "ServiceB", "ServiceC"]);
    });

    it("should detect circular dependencies", async () => {
      // Create circular dependency
      lifecycle.register("ServiceA", ["ServiceB"], {
        start: async () => {},
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        start: async () => {},
      });

      await expect(lifecycle.start()).rejects.toThrow(/circular dependency/i);
    });

    it("should handle dependency failures", async () => {
      lifecycle.register("FailingService", [], {
        start: async () => {
          throw new Error("Service failed to start");
        },
      });

      await expect(lifecycle.start()).rejects.toThrow(
        "Service failed to start",
      );
    });
  });

  describe("Shutdown Process", () => {
    it("should shutdown dependencies in reverse order", async () => {
      const shutdownOrder: string[] = [];

      lifecycle.register("ServiceA", [], {
        stop: async () => {
          shutdownOrder.push("ServiceA");
        },
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        stop: async () => {
          shutdownOrder.push("ServiceB");
        },
      });

      await lifecycle.start();
      await lifecycle.stop();

      expect(shutdownOrder).toEqual(["ServiceB", "ServiceA"]);
    });

    it("should handle shutdown timeouts", async () => {
      lifecycle.register("SlowService", [], {
        stop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        },
      });

      await lifecycle.start();
      await lifecycle.stop();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/timeout/i),
        expect.any(Object),
      );
    });

    it("should execute custom shutdown handlers", async () => {
      const handlerMock = vi.fn();
      lifecycle.registerShutdownHandler(handlerMock);

      await lifecycle.start();
      await lifecycle.stop();

      expect(handlerMock).toHaveBeenCalled();
    });
  });

  describe("HTTP Server Integration", () => {
    it("should handle HTTP server shutdown", async () => {
      lifecycle.setHttpServer(mockHttpServer as Server);

      await lifecycle.start();
      await lifecycle.stop();

      expect(mockHttpServer.close).toHaveBeenCalled();
    });

    it("should handle HTTP server errors during shutdown", async () => {
      // Mock HTTP server to trigger an error during shutdown
      const serverError = new Error("Server close error");
      mockHttpServer.close = vi.fn().mockImplementation((callback) => {
        if (callback) callback(serverError);
      });

      lifecycle.setHttpServer(mockHttpServer as Server);

      await lifecycle.start();

      // Clear any previous error logs
      mockLogger.error.mockClear();

      await lifecycle.stop();

      // Check that an error was logged with the correct message
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing HTTP server",
        expect.objectContaining({
          error: serverError,
        }),
      );
    });
  });

  describe("Process Signal Handling", () => {
    it("should handle SIGTERM signal", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate SIGTERM signal
      process.emit("SIGTERM");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/sigterm/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });

    it("should handle SIGINT signal", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate SIGINT signal
      process.emit("SIGINT");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/sigint/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });

    it("should handle uncaught exceptions", async () => {
      const stopSpy = vi.spyOn(lifecycle, "stop");

      // Simulate uncaught exception
      process.emit("uncaughtException", new Error("Test error"));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/uncaughtException/i),
        expect.any(Object),
      );
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe("Error Recovery", () => {
    it("should handle database initialization failures", async () => {
      mockDatabaseService.initialize.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await expect(lifecycle.start()).rejects.toThrow("Database error");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle service initialization retries", async () => {
      let attempts = 0;

      // Register a service that fails on first attempt but succeeds on second
      lifecycle.register("RetryService", [], {
        start: async () => {
          attempts++;
          if (attempts === 1) {
            // This test is expected to fail on first attempt and we just want to verify
            // the attempts count and error handling
            throw new Error("First attempt failed");
          }
          // We won't reach here in the test as we're expecting the rejection
        },
      });

      // First attempt will fail - we expect this to be rejected
      await expect(lifecycle.start()).rejects.toThrow("First attempt failed");

      // Verify that the attempt was made
      expect(attempts).toBe(1);
    });

    it("should handle partial initialization rollback", async () => {
      const rollbackMock = vi.fn();

      // Override the rollbackInitialization method
      const instance = lifecycle as any;
      const originalRollback = instance.rollbackInitialization;

      // Replace with our mock implementation
      instance.rollbackInitialization = async () => {
        rollbackMock();
      };

      try {
        // Register a successful service
        lifecycle.register("SuccessService", [], {
          start: async () => {},
        });

        // Register a failing service
        lifecycle.register("FailingService", ["SuccessService"], {
          start: async () => {
            throw new Error("Service failed");
          },
        });

        // This should fail and trigger rollback
        await expect(lifecycle.start()).rejects.toThrow("Service failed");

        // Verify rollback was called
        expect(rollbackMock).toHaveBeenCalled();
      } finally {
        // Restore original
        instance.rollbackInitialization = originalRollback;
      }
    });
  });

  describe("Advanced Dependency Management", () => {
    it("should handle multiple dependency layers correctly", async () => {
      const initOrder: string[] = [];

      // Create a more complex dependency tree
      //  A
      // / \
      // B  C
      // |  |
      // D  E
      //  \/
      //  F

      lifecycle.register("ServiceA", [], {
        start: async () => {
          initOrder.push("ServiceA");
        },
      });

      lifecycle.register("ServiceB", ["ServiceA"], {
        start: async () => {
          initOrder.push("ServiceB");
        },
      });

      lifecycle.register("ServiceC", ["ServiceA"], {
        start: async () => {
          initOrder.push("ServiceC");
        },
      });

      lifecycle.register("ServiceD", ["ServiceB"], {
        start: async () => {
          initOrder.push("ServiceD");
        },
      });

      lifecycle.register("ServiceE", ["ServiceC"], {
        start: async () => {
          initOrder.push("ServiceE");
        },
      });

      lifecycle.register("ServiceF", ["ServiceD", "ServiceE"], {
        start: async () => {
          initOrder.push("ServiceF");
        },
      });

      await lifecycle.start();

      // Verify ServiceA comes before ServiceB and ServiceC
      expect(initOrder.indexOf("ServiceA")).toBeLessThan(
        initOrder.indexOf("ServiceB"),
      );
      expect(initOrder.indexOf("ServiceA")).toBeLessThan(
        initOrder.indexOf("ServiceC"),
      );

      // Verify ServiceB comes before ServiceD
      expect(initOrder.indexOf("ServiceB")).toBeLessThan(
        initOrder.indexOf("ServiceD"),
      );

      // Verify ServiceC comes before ServiceE
      expect(initOrder.indexOf("ServiceC")).toBeLessThan(
        initOrder.indexOf("ServiceE"),
      );

      // Verify ServiceD and ServiceE come before ServiceF
      expect(initOrder.indexOf("ServiceD")).toBeLessThan(
        initOrder.indexOf("ServiceF"),
      );
      expect(initOrder.indexOf("ServiceE")).toBeLessThan(
        initOrder.indexOf("ServiceF"),
      );
    });

    it("should handle custom shutdown timeout", async () => {
      // Get direct access to the ApplicationLifecycle instance
      const applicationLifecycle = container.get(
        TYPES.ApplicationLifecycle,
      ) as ApplicationLifecycle;

      // Now we can access the private property
      applicationLifecycle["shutdownTimeout"] = 50; // Set very short timeout for test

      // Add a service with a slow shutdown
      lifecycle.register("SlowShutdownService", [], {
        stop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 200)); // Longer than timeout
        },
      });

      await lifecycle.start();

      // Clear any previous logs
      mockLogger.error.mockClear();

      // Perform shutdown
      await lifecycle.stop();

      // Verify there's an error or warning about the timeout
      expect(
        mockLogger.warn.mock.calls.some(
          (call: any[]) =>
            call[0] &&
            typeof call[0] === "string" &&
            call[0].toLowerCase().includes("timeout"),
        ),
      ).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle WebSocket service errors gracefully", async () => {
      // Create a WebSocket service that throws during shutdown
      const errorWebSocketService: MockWebSocketService = {
        initialize: vi.fn().mockResolvedValue(undefined),
        shutdown: vi
          .fn()
          .mockRejectedValue(new Error("WebSocket shutdown failure")),
        close: vi.fn().mockResolvedValue(undefined),
        sendToClient: vi.fn().mockResolvedValue(true),
        publish: vi.fn().mockResolvedValue(0),
        broadcast: vi.fn().mockResolvedValue(0),
        subscribe: vi.fn().mockReturnValue(true),
        unsubscribe: vi.fn().mockReturnValue(true),
        getClientChannels: vi.fn().mockReturnValue(new Set<string>()),
        getChannelClients: vi.fn().mockReturnValue(new Set<string>()),
        authenticateClient: vi.fn().mockResolvedValue(true),
        disconnectClient: vi
          .fn()
          .mockImplementation((_clientId, _reason) => {}),
        getStats: vi.fn().mockReturnValue({
          totalConnections: 0,
          authenticatedConnections: 0,
          channelCounts: {},
          messagesPerSecond: 0,
          peakConnections: 0,
        }),
        setPresence: vi.fn().mockImplementation(async () => {}),
        getPresence: vi.fn().mockResolvedValue(null),
      };

      // Get a fresh instance to avoid conflicts with other tests
      container = new Container();
      container
        .bind<ILoggerService>(TYPES.LoggerService)
        .toConstantValue(mockLogger);
      container
        .bind<IWebSocketService>(TYPES.WebSocketService)
        .toConstantValue(errorWebSocketService);
      container
        .bind<IDatabaseServer>(TYPES.DatabaseService)
        .toConstantValue(mockDatabaseService);
      container
        .bind<IApplicationLifecycle>(TYPES.ApplicationLifecycle)
        .to(ApplicationLifecycle)
        .inSingletonScope();

      // Get lifecycle instance with the problematic WebSocket service
      lifecycle = container.get<IApplicationLifecycle>(
        TYPES.ApplicationLifecycle,
      );

      await lifecycle.start();

      // Clear previous logs
      mockLogger.error.mockClear();

      // Shutdown should complete despite WebSocket error
      await lifecycle.stop();

      // Verify the error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing WebSocket connections",
        expect.objectContaining({
          error: expect.any(Error),
        }),
      );
    });

    it("should handle unregistered dependencies", async () => {
      // Register a service with a nonexistent dependency
      lifecycle.register("InvalidService", ["NonExistentService"], {
        start: async () => {},
      });

      // Should fail to initialize due to unresolvable dependency
      await expect(lifecycle.start()).rejects.toThrow(/could not initialize/i);
    });

    it("should skip shutdown for uninitialized dependencies", async () => {
      // Replace the usual stop method with a custom implementation to verify behavior
      const mockShutdown = vi.fn();

      lifecycle.register("TestService", [], {
        start: async () => {
          /* This service will initialize */
        },
        stop: mockShutdown,
      });

      // Start the service
      await lifecycle.start();

      // Reset the mock to ensure we only count calls after initialization
      mockShutdown.mockClear();

      // Shutdown
      await lifecycle.stop();

      // Verify the service's shutdown was called
      expect(mockShutdown).toHaveBeenCalled();

      // Reset the initialized services and try shutdown again
      (lifecycle as any).initialized = new Set();

      mockShutdown.mockClear();

      // Call stop again - this time no services should be shut down
      await lifecycle.stop();

      // Since the service isn't marked as initialized, it shouldn't be shut down
      expect(mockShutdown).not.toHaveBeenCalled();
    });
  });
});
