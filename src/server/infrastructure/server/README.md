# 🖧 Server Infrastructure

## 📋 Purpose

The server infrastructure provides a robust foundation for HTTP/HTTPS server functionality, offering:

- HTTP server setup and configuration
- Middleware management and routing
- Request and response handling
- Server lifecycle management (start, stop, restart)
- TLS/SSL configuration for secure communication
- Health checking and monitoring
- Performance optimization
- Graceful shutdown handling

This module serves as the core HTTP server layer, enabling the application to receive and respond to web requests while providing essential infrastructure services.

## 🧩 Key Components

### 1️⃣ Server Manager

- **`ServerManager`**: Core implementation for HTTP server management
- Handles server configuration, startup, and lifecycle
- Provides middleware registration and routing

### 2️⃣ Module Exports

- **`index.ts`**: Exports server interfaces and implementations
- Provides easy access to server functionality

## 🛠️ Usage Instructions

### Basic Server Setup

```typescript
import { ServerManager } from "@/server/infrastructure/server";
import express from "express";
import { Logger } from "@/server/infrastructure/logging";

async function startServer(): Promise<void> {
  // Create logger instance
  const logger = new Logger("ServerManager");

  // Create server manager
  const serverManager = new ServerManager({
    port: 3000,
    host: "0.0.0.0",
    logger,
  });

  // Create Express app
  const app = express();

  // Add middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add routes
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Register Express app with server manager
  serverManager.setApp(app);

  // Start the server
  await serverManager.start();

  logger.info(`Server started on http://localhost:3000`);
}
```

### Advanced Configuration

```typescript
import { ServerManager } from "@/server/infrastructure/server";
import express from "express";
import { readFileSync } from "fs";
import path from "path";

async function startSecureServer(): Promise<void> {
  // Create server manager with HTTPS options
  const serverManager = new ServerManager({
    port: 443,
    host: "0.0.0.0",

    // HTTPS configuration
    https: {
      key: readFileSync(path.resolve("./certs/private-key.pem")),
      cert: readFileSync(path.resolve("./certs/certificate.pem")),
      ca: readFileSync(path.resolve("./certs/ca-certificate.pem")),
    },

    // Additional options
    requestTimeout: 30000, // 30 seconds
    keepAliveTimeout: 65000, // 65 seconds
    maxHeadersCount: 100,

    // Graceful shutdown options
    shutdownTimeout: 10000, // 10 seconds

    // Trust proxy for correct client IP behind load balancer
    trustProxy: true,
  });

  // Create and configure Express app
  const app = express();
  // ... configure middleware and routes

  // Register app
  serverManager.setApp(app);

  // Start the server
  await serverManager.start();
}
```

### Lifecycle Management

```typescript
import { ServerManager } from "@/server/infrastructure/server";
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";

function registerServerWithLifecycle(
  serverManager: ServerManager,
  lifecycle: ApplicationLifecycle,
): void {
  // Register server startup hook
  lifecycle.registerStartupHook(
    "http-server",
    async () => {
      await serverManager.start();
    },
    ["database"], // Start after database is ready
  );

  // Register server shutdown hook
  lifecycle.registerShutdownHook("http-server", async () => {
    await serverManager.stop();
  });

  // Register health check
  lifecycle.registerHealthCheck("http-server", async () => {
    return serverManager.isRunning();
  });
}
```

### Multiple Server Support

```typescript
import { ServerManager } from "@/server/infrastructure/server";
import express from "express";

async function setupMultipleServers(): Promise<void> {
  // API server on port 3000
  const apiServer = new ServerManager({
    port: 3000,
    name: "api-server",
  });

  const apiApp = express();
  // Configure API routes
  apiServer.setApp(apiApp);

  // Admin server on port 3001
  const adminServer = new ServerManager({
    port: 3001,
    name: "admin-server",
  });

  const adminApp = express();
  // Configure admin routes
  adminServer.setApp(adminApp);

  // Start both servers
  await Promise.all([apiServer.start(), adminServer.start()]);

  console.log("All servers started successfully");
}
```

## 🏗️ Architecture Decisions

### Express Integration

- **Decision**: Integrate with Express.js
- **Rationale**: Popular, mature framework with extensive middleware ecosystem
- **Benefit**: Leverages existing Express knowledge and middleware

### Lifecycle Management

- **Decision**: Implement robust server lifecycle
- **Rationale**: Ensures clean startup and shutdown processes
- **Implementation**: Managed start/stop with proper error handling

### Graceful Shutdown

- **Decision**: Support graceful shutdown
- **Rationale**: Prevents request interruption during deployments
- **Benefit**: Improved reliability during scaling and updates

### TLS/SSL Support

- **Decision**: First-class TLS/SSL support
- **Rationale**: Security is a primary concern for modern applications
- **Implementation**: Simple configuration for HTTPS

## ⚙️ Setup and Configuration Notes

### Basic Configuration

Configure the server with appropriate options:

```typescript
import { ServerManager } from "@/server/infrastructure/server";

const serverManager = new ServerManager({
  // Basic settings
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",

  // Timeouts
  requestTimeout: 30000, // 30 seconds
  keepAliveTimeout: 65000, // 65 seconds

  // Proxy settings
  trustProxy: process.env.BEHIND_PROXY === "true",
});
```

### TLS/SSL Configuration

Setting up HTTPS:

```typescript
import { ServerManager } from "@/server/infrastructure/server";
import { readFileSync } from "fs";
import path from "path";

// Path to certificate files
const certsDir = process.env.CERTS_DIR || "./certs";

// HTTPS configuration
const serverManager = new ServerManager({
  port: 443,

  // HTTPS options
  https: {
    key: readFileSync(path.join(certsDir, "private-key.pem")),
    cert: readFileSync(path.join(certsDir, "certificate.pem")),

    // Optional: Certificate Authority if using a custom CA
    ca:
      process.env.USE_CA === "true"
        ? readFileSync(path.join(certsDir, "ca.pem"))
        : undefined,

    // Optional: Configure TLS versions
    minVersion: "TLSv1.2",

    // Optional: Configure cipher suites
    ciphers: process.env.TLS_CIPHERS || undefined,
  },
});
```

### Graceful Shutdown Configuration

Configure graceful shutdown:

```typescript
import { ServerManager } from "@/server/infrastructure/server";

const serverManager = new ServerManager({
  // Server settings
  port: 3000,

  // Graceful shutdown options
  shutdownTimeout: 30000, // 30 seconds
  shutdownHandler: {
    // Custom handlers during shutdown
    onShutdownStart: async () => {
      console.log("Server shutdown initiated");
      // Notify monitoring systems
    },
    onShutdownComplete: async () => {
      console.log("Server shutdown completed");
      // Perform any cleanup
    },
  },
});

// Process signal handling
process.on("SIGTERM", async () => {
  console.log("SIGTERM received");
  await serverManager.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received");
  await serverManager.stop();
  process.exit(0);
});
```

### Performance Optimization

For high-traffic applications:

```typescript
import { ServerManager } from "@/server/infrastructure/server";

const serverManager = new ServerManager({
  // Server settings
  port: 3000,

  // Performance optimizations
  compression: true, // Enable compression

  // Connection handling
  maxConnections: 10000,
  keepAliveTimeout: 65000, // 65 seconds (slightly higher than ALB's 60s default)
  headersTimeout: 66000, // 66 seconds (must be > keepAliveTimeout)

  // HTTP/2 support (requires HTTPS)
  http2: true,

  // Clustering
  cluster: {
    enabled: process.env.NODE_ENV === "production",
    workers: process.env.WORKER_COUNT
      ? parseInt(process.env.WORKER_COUNT)
      : "auto", // Use "auto" for CPU count
  },
});
```

### Load Balancer Configuration

For servers behind load balancers:

```typescript
import { ServerManager } from "@/server/infrastructure/server";

const serverManager = new ServerManager({
  // Server settings
  port: 3000,

  // Load balancer settings
  trustProxy: true, // Trust X-Forwarded-* headers

  // Health check endpoint for load balancer
  healthCheck: {
    path: "/health",
    handler: async (req, res) => {
      // Check dependencies
      const dbHealthy = await checkDatabaseConnection();
      const cacheHealthy = await checkCacheConnection();

      if (dbHealthy && cacheHealthy) {
        res.status(200).json({ status: "healthy" });
      } else {
        res.status(503).json({
          status: "unhealthy",
          details: {
            database: dbHealthy,
            cache: cacheHealthy,
          },
        });
      }
    },
  },
});
```
