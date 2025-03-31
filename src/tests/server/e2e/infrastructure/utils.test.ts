import { Server } from "http";

import { Container } from "inversify";

import {
  DependencyOrder,
  IApplicationLifecycle,
  ApplicationLifecycle,
  TYPES,
  LoggerService,
} from "@server/infrastructure";

describe("Application Lifecycle Integration Tests", () => {
  let container: Container;
  let lifecycle: IApplicationLifecycle;
  let mockServer: Server;
  let initializationOrder: string[];
  let shutdownOrder: string[];

  beforeEach(() => {
    // Setup DI container
    container = new Container();
    container.bind(TYPES.LoggerService).to(LoggerService);
    container.bind(TYPES.ApplicationLifecycle).to(ApplicationLifecycle);

    // Get lifecycle instance
    lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );

    // Reset tracking arrays
    initializationOrder = [];
    shutdownOrder = [];

    // Create mock HTTP server
    mockServer = new Server();
  });

  afterEach(async () => {
    // Clean up server
    mockServer.close();
  });

  describe("Dependency Management", () => {
    it("should initialize dependencies in correct order", async () => {
      // Create test dependencies
      const dependencies: DependencyOrder[] = [
        {
          name: "database",
          startup: async () => {
            await delay(10);
            initializationOrder.push("database");
          },
          shutdown: async () => {
            await delay(10);
            shutdownOrder.push("database");
          },
        },
        {
          name: "cache",
          dependencies: ["database"],
          startup: async () => {
            await delay(10);
            initializationOrder.push("cache");
          },
          shutdown: async () => {
            await delay(10);
            shutdownOrder.push("cache");
          },
        },
        {
          name: "api",
          dependencies: ["cache", "database"],
          startup: async () => {
            await delay(10);
            initializationOrder.push("api");
          },
          shutdown: async () => {
            await delay(10);
            shutdownOrder.push("api");
          },
        },
      ];

      // Register dependencies
      dependencies.forEach((dep) => {
        lifecycle.register(dep.name, dep.dependencies || [], {
          start: dep.startup,
          stop: dep.shutdown,
        });
      });

      // Initialize
      await lifecycle.start();

      // Verify initialization order
      expect(initializationOrder).toEqual(["database", "cache", "api"]);
    });

    it("should shutdown dependencies in reverse order", async () => {
      // Create test dependencies
      const dependencies: DependencyOrder[] = [
        {
          name: "database",
          startup: async () => {
            initializationOrder.push("database");
          },
          shutdown: async () => {
            shutdownOrder.push("database");
          },
        },
        {
          name: "cache",
          dependencies: ["database"],
          startup: async () => {
            initializationOrder.push("cache");
          },
          shutdown: async () => {
            shutdownOrder.push("cache");
          },
        },
      ];

      // Register dependencies
      dependencies.forEach((dep) => {
        lifecycle.register(dep.name, dep.dependencies || [], {
          start: dep.startup,
          stop: dep.shutdown,
        });
      });

      // Initialize and shutdown
      await lifecycle.start();
      await lifecycle.stop();

      // Verify shutdown order (reverse of initialization)
      expect(shutdownOrder).toEqual(["cache", "database"]);
    });

    it("should handle circular dependencies", async () => {
      const circular1: DependencyOrder = {
        name: "circular1",
        dependencies: ["circular2"],
        startup: async () => {},
        shutdown: async () => {},
      };

      const circular2: DependencyOrder = {
        name: "circular2",
        dependencies: ["circular1"],
        startup: async () => {},
        shutdown: async () => {},
      };

      lifecycle.register(circular1.name, circular1.dependencies || [], {
        start: circular1.startup,
        stop: circular1.shutdown,
      });
      lifecycle.register(circular2.name, circular2.dependencies || [], {
        start: circular2.startup,
        stop: circular2.shutdown,
      });

      await expect(lifecycle.start()).rejects.toThrow(/circular/i);
    });
  });

  describe("Server Integration", () => {
    it("should handle server lifecycle", async () => {
      let serverStarted = false;
      let serverStopped = false;

      // Create mock server behaviors
      mockServer.listen = () => {
        serverStarted = true;
        return mockServer;
      };
      mockServer.close = (callback?: (err?: Error) => void) => {
        serverStopped = true;
        if (callback) callback();
        return mockServer;
      };

      // Set server and initialize
      lifecycle.setHttpServer(mockServer);
      await lifecycle.start();

      expect(serverStarted).toBe(true);

      // Shutdown
      await lifecycle.stop();
      expect(serverStopped).toBe(true);
    });

    it("should handle server errors", async () => {
      const serverError = new Error("Server start failed");
      mockServer.listen = () => {
        throw serverError;
      };

      lifecycle.setHttpServer(mockServer);
      await expect(lifecycle.start()).rejects.toThrow(serverError);
    });
  });

  describe("Shutdown Handlers", () => {
    it("should execute shutdown handlers", async () => {
      const shutdownHandlers: string[] = [];

      // Register multiple shutdown handlers
      lifecycle.registerShutdownHandler(async () => {
        await delay(10);
        shutdownHandlers.push("handler1");
      });

      lifecycle.registerShutdownHandler(async () => {
        await delay(10);
        shutdownHandlers.push("handler2");
      });

      // Initialize and shutdown
      await lifecycle.start();
      await lifecycle.stop();

      expect(shutdownHandlers).toContain("handler1");
      expect(shutdownHandlers).toContain("handler2");
    });

    it("should handle failed shutdown handlers", async () => {
      const successHandler = jest.fn();
      const errorHandler = jest
        .fn()
        .mockRejectedValue(new Error("Shutdown failed"));

      lifecycle.registerShutdownHandler(successHandler);
      lifecycle.registerShutdownHandler(errorHandler);

      await lifecycle.start();
      await expect(lifecycle.stop()).resolves.not.toThrow();

      expect(successHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle dependency initialization failures", async () => {
      const failingDep: DependencyOrder = {
        name: "failing",
        startup: async () => {
          throw new Error("Initialization failed");
        },
        shutdown: async () => {},
      };

      lifecycle.register(failingDep.name, failingDep.dependencies || [], {
        start: failingDep.startup,
        stop: failingDep.shutdown,
      });
      await expect(lifecycle.start()).rejects.toThrow("Initialization failed");
    });

    it("should handle dependency shutdown failures", async () => {
      const failingDep: DependencyOrder = {
        name: "failing",
        startup: async () => {},
        shutdown: async () => {
          throw new Error("Shutdown failed");
        },
      };

      lifecycle.register(failingDep.name, failingDep.dependencies || [], {
        start: failingDep.startup,
        stop: failingDep.shutdown,
      });
      await lifecycle.start();
      await expect(lifecycle.stop()).resolves.not.toThrow();
    });

    it("should handle missing dependencies", async () => {
      const depWithMissingDep: DependencyOrder = {
        name: "dependent",
        dependencies: ["nonexistent"],
        startup: async () => {},
        shutdown: async () => {},
      };

      lifecycle.register(
        depWithMissingDep.name,
        depWithMissingDep.dependencies || [],
        {
          start: depWithMissingDep.startup,
          stop: depWithMissingDep.shutdown,
        },
      );
      await expect(lifecycle.start()).rejects.toThrow(/missing dependency/i);
    });
  });
});

// Helper function to simulate async operations
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
