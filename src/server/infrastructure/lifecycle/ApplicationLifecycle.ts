import { Server } from "http";

import { inject, injectable } from "inversify";
import { v4 as uuidv4 } from "uuid";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";

import type {
  DependencyOrder,
  IApplicationLifecycle,
} from "@infrastructure/lifecycle";
import type { ILoggerService } from "@infrastructure/logging";
import type { IWebSocketService } from "@infrastructure/pubsub";

// Helper function to generate correlation ID since the import isn't working
function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Application lifecycle manager handles graceful startup and shutdown
 */
@injectable()
class ApplicationLifecycle implements IApplicationLifecycle {
  private httpServer: Server | null = null;
  private isShuttingDown = false;
  private dependencies: Map<
    string,
    DependencyOrder & {
      startup?: () => Promise<void>;
      shutdown?: () => Promise<void>;
    }
  > = new Map();
  private initialized: Set<string> = new Set();
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private shutdownTimeout = 30000; // 30 seconds default timeout

  /**
   * Create a new application lifecycle manager
   */
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
    @inject(TYPES.DatabaseService) private databaseService: IDatabaseServer,
  ) {
    // Register shutdown handlers for process signals
    this.registerProcessHandlers();

    // Register the database as a dependency by default
    this.registerDatabaseDependency();
  }

  /**
   * Set the HTTP server instance
   */
  setHttpServer(server: Server): void {
    this.httpServer = server;
  }

  /**
   * Register process signal handlers
   */
  private registerProcessHandlers(): void {
    // Handle SIGTERM (Docker graceful shutdown)
    process.on("SIGTERM", this.handleShutdownSignal.bind(this, "SIGTERM"));

    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", this.handleShutdownSignal.bind(this, "SIGINT"));

    // Handle uncaught exceptions (already logged by global error handler)
    process.on(
      "uncaughtException",
      this.handleShutdownSignal.bind(this, "uncaughtException"),
    );

    this.logger.info(
      "Process signal handlers registered for graceful shutdown",
    );
  }

  /**
   * Register the database dependency
   */
  private registerDatabaseDependency(): void {
    this.registerDependency({
      name: "Database",
      dependencies: [],
      startup: async () => {
        await this.databaseService.initialize();
      },
      shutdown: async () => {
        await this.databaseService.close();
      },
    });
  }

  /**
   * Handle shutdown signals
   */
  private handleShutdownSignal(signal: string): void {
    if (this.isShuttingDown) {
      return; // Prevent multiple shutdown attempts
    }

    const correlationId = generateCorrelationId();
    this.logger.info(
      `Received ${signal} signal - initiating graceful shutdown`,
      { correlationId },
    );

    // Begin graceful shutdown
    this.shutdown(signal).catch((error) => {
      this.logger.error("Error during graceful shutdown", {
        error,
        correlationId,
      });
      process.exit(1);
    });
  }

  /**
   * Register a component to be managed in the lifecycle
   * @implements IApplicationLifecycle.register
   */
  register(
    name: string,
    dependencies: string[],
    component: {
      start?: () => Promise<void>;
      stop?: () => Promise<void>;
    },
  ): void {
    this.registerDependency({
      name,
      dependencies,
      startup: component.start ? component.start : async () => {},
      shutdown: component.stop ? component.stop : async () => {},
    });
  }

  /**
   * Start the application and its dependencies
   * @implements IApplicationLifecycle.start
   */
  async start(): Promise<void> {
    return this.initialize();
  }

  /**
   * Stop the application and its dependencies
   * @implements IApplicationLifecycle.stop
   */
  async stop(): Promise<void> {
    return this.shutdown("manual");
  }

  /**
   * Register a dependency
   */
  registerDependency(
    dependency: DependencyOrder & {
      startup?: () => Promise<void>;
      shutdown?: () => Promise<void>;
    },
  ): void {
    this.dependencies.set(dependency.name, dependency);
    this.logger.debug(`Registered dependency: ${dependency.name}`);
  }

  /**
   * Register a shutdown handler
   */
  registerShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    const correlationId = generateCorrelationId();
    this.logger.info("Starting application initialization", { correlationId });

    const startTime = Date.now();

    try {
      // Initialize database
      await this.databaseService.initialize();
      this.logger.info("Database initialized");

      // Get all dependencies
      const dependencies = Array.from(this.dependencies.values());

      // Create a dependency graph and initialize in order
      const initialized = new Set<string>();
      const remaining = [...dependencies];

      while (remaining.length > 0) {
        const initializedThisPass = await this.initializeDependencyBatch(
          remaining,
          initialized,
          correlationId,
        );

        if (initializedThisPass === 0) {
          // Circular dependency or unresolvable dependencies
          const uninitialized = remaining.map((dep) => dep.name).join(", ");
          throw new Error(
            `Could not initialize dependencies: ${uninitialized}. Possible circular dependency.`,
          );
        }
      }

      this.initialized = initialized;
      const duration = Date.now() - startTime;

      this.logger.info(
        `Application initialization completed successfully in ${duration}ms`,
        { correlationId },
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Application initialization failed after ${duration}ms`,
        {
          error,
          correlationId,
        },
      );
      throw error;
    }
  }

  /**
   * Initialize a batch of dependencies whose requirements are satisfied
   */
  private async initializeDependencyBatch(
    remaining: Array<
      DependencyOrder & {
        startup?: () => Promise<void>;
        shutdown?: () => Promise<void>;
      }
    >,
    initialized: Set<string>,
    correlationId: string,
  ): Promise<number> {
    // Find dependencies that can be initialized
    const canInitialize: Array<
      DependencyOrder & {
        startup?: () => Promise<void>;
        shutdown?: () => Promise<void>;
      }
    > = [];
    const stillRemaining: Array<
      DependencyOrder & {
        startup?: () => Promise<void>;
        shutdown?: () => Promise<void>;
      }
    > = [];

    for (const dep of remaining) {
      const dependenciesMet =
        !dep.dependencies ||
        dep.dependencies.every((depName: string) => initialized.has(depName));

      if (dependenciesMet) {
        canInitialize.push(dep);
      } else {
        stillRemaining.push(dep);
      }
    }

    if (canInitialize.length === 0) {
      return 0;
    }

    // Initialize all dependencies that can be initialized in parallel
    await Promise.all(
      canInitialize.map(async (dep) => {
        try {
          this.logger.debug(`Initializing dependency: ${dep.name}`, {
            correlationId,
          });
          const startTime = Date.now();

          if (dep.startup) {
            await dep.startup();
          }

          const duration = Date.now() - startTime;
          initialized.add(dep.name);

          this.logger.info(
            `Initialized dependency: ${dep.name} (${duration}ms)`,
            { correlationId },
          );
        } catch (error) {
          this.logger.error(`Failed to initialize dependency: ${dep.name}`, {
            error,
            correlationId,
          });
          throw error;
        }
      }),
    );

    // Update remaining list
    remaining.splice(0, remaining.length, ...stillRemaining);

    return canInitialize.length;
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(reason: string = "manual"): Promise<void> {
    if (this.isShuttingDown) {
      return; // Prevent multiple shutdown attempts
    }

    this.isShuttingDown = true;
    const correlationId = generateCorrelationId();
    this.logger.info(`Starting graceful shutdown: ${reason}`, {
      correlationId,
    });

    const startTime = Date.now();

    // Create a timeout promise
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown timed out after ${this.shutdownTimeout}ms`));
      }, this.shutdownTimeout);
    });

    try {
      // Race the shutdown process against the timeout
      await Promise.race([this.performShutdown(correlationId), timeoutPromise]);

      const duration = Date.now() - startTime;
      this.logger.info(`Graceful shutdown completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error during graceful shutdown after ${duration}ms`, {
        error,
        correlationId,
      });

      // Force exit if it was a timeout
      if (duration >= this.shutdownTimeout) {
        this.logger.error(`Forcing exit after shutdown timeout`);
        process.exit(1);
      }
    } finally {
      // Give time for logs to flush
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  /**
   * Internal method to perform the actual shutdown steps
   */
  private async performShutdown(correlationId: string): Promise<void> {
    // Execute custom shutdown handlers first
    if (this.shutdownHandlers.length > 0) {
      this.logger.info(
        `Executing ${this.shutdownHandlers.length} shutdown handlers`,
      );
      await Promise.all(this.shutdownHandlers.map((handler) => handler()));
    }

    // Close WebSocket connections
    this.logger.info("Closing WebSocket connections");
    await this.webSocketService.close();

    // Shut down dependencies in reverse initialization order
    const dependencyNames = Array.from(this.initialized);
    const reverseDependencies = dependencyNames.reverse();

    this.logger.info(
      `Shutting down ${reverseDependencies.length} dependencies`,
    );

    for (const depName of reverseDependencies) {
      const dependency = this.dependencies.get(depName);
      if (!dependency) continue;

      try {
        this.logger.debug(`Shutting down dependency: ${depName}`);
        if (dependency && dependency.shutdown) {
          await dependency.shutdown();
        }
        this.logger.debug(`Dependency shutdown completed: ${depName}`);
      } catch (error) {
        this.logger.error(`Error shutting down dependency: ${depName}`, {
          error,
          correlationId,
        });
        // Continue shutting down other dependencies
      }
    }

    // Close HTTP server if it exists
    if (this.httpServer) {
      this.logger.info("Closing HTTP server");
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.close((err) => {
          if (err) {
            this.logger.error("Error closing HTTP server", {
              error: err,
              correlationId,
            });
            reject(err);
          } else {
            this.logger.info("HTTP server closed successfully");
            resolve();
          }
        });
      });
    }

    // Close database connection
    await this.databaseService.close();
    this.logger.info("Database connection closed");
  }
}

export default ApplicationLifecycle;
