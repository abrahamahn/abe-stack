# 🔄 Application Lifecycle

## 📋 Purpose

The application lifecycle module provides a framework for managing the application's startup, runtime, and shutdown processes, offering:

- Structured initialization and shutdown sequences
- Dependency ordering for component startup/shutdown
- Graceful shutdown handling for clean resource release
- Health checking and readiness monitoring
- Event-based lifecycle hooks
- Recovery mechanisms for startup failures

This module ensures that all application components are properly initialized in the correct order and gracefully terminated when the application shuts down.

## 🧩 Key Components

### 1️⃣ Application Lifecycle Manager

- **`ApplicationLifecycle`**: Core service for managing application startup/shutdown
- **`IApplicationLifecycle`**: Interface defining the lifecycle contract
- Coordinates initialization and termination of all application components

### 2️⃣ Utility Functions

- **`sleep`**: Utility for controlled delays during startup/shutdown processes
- Simplifies sequential timing operations

### 3️⃣ Module Exports

- **`index.ts`**: Exports lifecycle interfaces and implementations
- Provides easy access to lifecycle functionality

## 🛠️ Usage Instructions

### Initializing the Application

```typescript
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";
import { container } from "@/server/infrastructure/di";
import { TYPES } from "@/server/infrastructure/di/types";

async function startApplication(): Promise<void> {
  // Create lifecycle manager
  const lifecycle = new ApplicationLifecycle();

  // Register startup hooks in dependency order
  lifecycle.registerStartupHook("database", async () => {
    const databaseServer = container.get(TYPES.DatabaseServer);
    await databaseServer.initialize();
  });

  lifecycle.registerStartupHook(
    "cache",
    async () => {
      const cacheService = container.get(TYPES.CacheService);
      await cacheService.initialize();
    },
    ["database"],
  ); // Depends on database

  lifecycle.registerStartupHook(
    "server",
    async () => {
      const serverManager = container.get(TYPES.ServerManager);
      await serverManager.start();
    },
    ["database", "cache"],
  ); // Depends on database and cache

  // Start the application
  try {
    await lifecycle.initialize();
    console.log("Application started successfully");
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}
```

### Shutting Down the Application

```typescript
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";

// Set up shutdown handlers
function setupShutdown(lifecycle: ApplicationLifecycle): void {
  // Handle process termination signals
  const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down...`);

      try {
        // Graceful shutdown with timeout
        await lifecycle.shutdown(5000); // 5 second timeout
        console.log("Shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  });
}
```

### Component Integration

```typescript
import { inject, injectable } from "inversify";
import { IApplicationLifecycle } from "@/server/infrastructure/lifecycle";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class YourService {
  constructor(
    @inject(TYPES.ApplicationLifecycle)
    private lifecycle: IApplicationLifecycle,
  ) {
    // Register hooks during construction
    this.registerLifecycleHooks();
  }

  private registerLifecycleHooks(): void {
    // Register startup hook
    this.lifecycle.registerStartupHook(
      "yourService",
      async () => {
        await this.initialize();
      },
      ["database"],
    ); // Dependencies

    // Register shutdown hook
    this.lifecycle.registerShutdownHook("yourService", async () => {
      await this.cleanup();
    });

    // Register health check
    this.lifecycle.registerHealthCheck("yourService", async () => {
      return this.isHealthy();
    });
  }

  private async initialize(): Promise<void> {
    // Initialization logic
  }

  private async cleanup(): Promise<void> {
    // Cleanup logic
  }

  private async isHealthy(): Promise<boolean> {
    // Health check logic
    return true;
  }
}
```

## 🏗️ Architecture Decisions

### Hook-Based Lifecycle Management

- **Decision**: Use named hooks with dependency specifications
- **Rationale**: Provides flexible ordering without hard-coded sequences
- **Benefit**: Components can be added/removed without changing startup order

### Graceful Shutdown Support

- **Decision**: Implement controlled shutdown with timeouts
- **Rationale**: Ensures resources are properly released before termination
- **Implementation**: Reverse-order shutdown with timeout fallbacks

### Health Checking

- **Decision**: Include health check functionality in lifecycle
- **Rationale**: Enables monitoring of application readiness and health
- **Benefit**: Simplifies integration with orchestration systems

### Error Recovery

- **Decision**: Implement retry and partial startup capabilities
- **Rationale**: Increases application resilience to startup failures
- **Implementation**: Configurable retry policies for critical components

## ⚙️ Setup and Configuration Notes

### Basic Lifecycle Setup

In your application's entry point:

```typescript
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";
import { container } from "@/server/infrastructure/di";
import { TYPES } from "@/server/infrastructure/di/types";

async function bootstrap(): Promise<void> {
  // Create and register lifecycle manager
  const lifecycle = new ApplicationLifecycle({
    maxStartupRetries: 3,
    startupRetryDelay: 1000,
    shutdownTimeout: 10000,
  });

  // Make available through DI
  container.bind(TYPES.ApplicationLifecycle).toConstantValue(lifecycle);

  // Register component hooks (can be done by components themselves)
  registerComponentHooks(lifecycle);

  // Set up signal handlers
  setupShutdownHandlers(lifecycle);

  // Start the application
  await lifecycle.initialize();
}
```

### Dependency Ordering

Example of proper dependency ordering:

```
Database → Cache → API Server → Background Jobs
   ↓          ↓          ↓            ↓
   └────┬─────┘          |            |
        └────────┬───────┘            |
                 └──────────┬─────────┘
                            ↓
                      WebSocket Server
```

### Shutdown Sequence

For proper shutdown order, register hooks in reverse dependency order:

```typescript
// Shutdown order will be reversed from startup:
// WebSocket → Background Jobs → API Server → Cache → Database

lifecycle.registerShutdownHook("webSocket", async () => {
  await webSocketService.shutdown();
});

lifecycle.registerShutdownHook("backgroundJobs", async () => {
  await jobService.shutdown();
});

// ... and so on
```

### Health Check Integration

For Kubernetes or similar environments:

```typescript
import express from "express";
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";

function setupHealthEndpoints(
  app: express.Application,
  lifecycle: ApplicationLifecycle,
): void {
  // Readiness probe
  app.get("/ready", async (req, res) => {
    const isReady = await lifecycle.isReady();
    res.status(isReady ? 200 : 503).json({ ready: isReady });
  });

  // Liveness probe
  app.get("/health", async (req, res) => {
    const health = await lifecycle.checkHealth();
    res.status(health.healthy ? 200 : 503).json(health);
  });
}
```
