# 📝 Logging System

## 📋 Purpose

The logging system provides a comprehensive framework for application logging, offering:

- Structured logging with rich contextual information
- Multiple log levels and severity filtering
- Pluggable transport system for different output destinations
- Contextual logging with request tracking
- Performance metrics and timing capabilities
- Environment-aware formatting options

This module ensures that application events, errors, and diagnostic information are properly captured, formatted, and stored for monitoring and troubleshooting.

## 🧩 Key Components

### 1️⃣ Logger Service

- **`LoggerService`**: Core service for application logging
- **`ILoggerService`**: Interface defining the logging contract
- Provides methods for different log levels (debug, info, warn, error)

### 2️⃣ Transport System

- **`ConsoleTransport`**: Console output for logs
- Pluggable transport architecture for extensibility
- Support for filtering, formatting, and routing logs

### 3️⃣ Server Logger

- **`ServerLogger`**: HTTP request logging middleware
- Captures request/response details and performance metrics
- Provides structured access logs in various formats

## 🛠️ Usage Instructions

### Basic Logging

```typescript
import { inject, injectable } from "inversify";
import { ILoggerService } from "@/server/infrastructure/logging";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class UserService {
  private logger: ILoggerService;

  constructor(@inject(TYPES.LoggerService) loggerService: ILoggerService) {
    // Create a contextualized logger
    this.logger = loggerService.createLogger("UserService");
  }

  async getUserById(id: string): Promise<User | null> {
    // Simple log message
    this.logger.debug(`Fetching user with ID: ${id}`);

    try {
      // Implementation...
      const user = await this.userRepository.findById(id);

      if (!user) {
        // Log with structured data
        this.logger.info("User not found", { userId: id });
        return null;
      }

      // Log with structured data
      this.logger.debug("User retrieved successfully", {
        userId: id,
        email: user.email,
      });

      return user;
    } catch (error) {
      // Error logging
      this.logger.error("Failed to fetch user", {
        userId: id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Performance Logging

```typescript
import { inject, injectable } from "inversify";
import { ILoggerService } from "@/server/infrastructure/logging";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class ReportService {
  constructor(@inject(TYPES.LoggerService) private logger: ILoggerService) {}

  async generateReport(reportId: string): Promise<ReportData> {
    // Start a timer
    const timer = this.logger.startTimer();

    this.logger.info("Starting report generation", { reportId });

    // Perform operations...
    const reportData = await this.collectReportData(reportId);

    // Log with elapsed time
    this.logger.info("Report generation complete", {
      reportId,
      elapsed: timer.elapsed(),
      recordCount: reportData.records.length,
    });

    return reportData;
  }
}
```

### Request Context Logging

```typescript
import { inject, injectable } from "inversify";
import { ILoggerService } from "@/server/infrastructure/logging";
import { TYPES } from "@/server/infrastructure/di/types";
import express from "express";

// Middleware to add request context to logger
function requestLoggerMiddleware(loggerService: ILoggerService) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Add request ID to context
    const requestId = req.headers["x-request-id"] || generateRequestId();

    // Create request-specific logger context
    const contextLogger = loggerService.withContext({
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Attach logger to request object
    req.logger = contextLogger;

    // Log request start
    contextLogger.info("Request started");

    // Continue
    next();
  };
}
```

## 🏗️ Architecture Decisions

### Structured JSON Logging

- **Decision**: Use structured JSON format for logs
- **Rationale**: Easier to parse, analyze, and filter in log management systems
- **Benefit**: Enhanced searchability and programmatic processing

### Logger Hierarchy

- **Decision**: Implement logger hierarchy with module-specific loggers
- **Rationale**: Allows for granular control over log levels by component
- **Implementation**: Named loggers with inheritance

### Transport Abstraction

- **Decision**: Create pluggable transport system
- **Rationale**: Flexibility to output logs to different destinations
- **Options**: Console, file, network, cloud services, etc.

### Context Propagation

- **Decision**: Support contextual logging across asynchronous operations
- **Rationale**: Maintains correlation between related log entries
- **Implementation**: Context objects that follow async chain

## ⚙️ Setup and Configuration Notes

### Logger Configuration

Configure the logger service with appropriate options:

```typescript
import { LoggerService } from "@/server/infrastructure/logging";
import { ConsoleTransport } from "@/server/infrastructure/logging";

// Create logger service
const logger = new LoggerService({
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  defaultContext: {
    service: "api-server",
    environment: process.env.NODE_ENV,
  },
});

// Add transports
logger.addTransport(
  new ConsoleTransport({
    colorize: process.env.NODE_ENV !== "production",
    includeTimestamp: true,
    format: "json",
  }),
);

// Optional file transport
if (process.env.LOG_TO_FILE === "true") {
  logger.addTransport(
    new FileTransport({
      filename: "./logs/application.log",
      maxSize: "10m",
      maxFiles: 5,
    }),
  );
}
```

### Log Levels

Available log levels in order of increasing severity:

```
trace → debug → info → warn → error → fatal
```

### Express Integration

For Express applications, add request logging middleware:

```typescript
import { ServerLogger } from "@/server/infrastructure/logging";
import express from "express";

const app = express();
const serverLogger = new ServerLogger({
  loggerService,
  excludePaths: ["/health", "/metrics"],
  logRequestBody: false,
  logResponseBody: false,
});

// Add as middleware
app.use(serverLogger.middleware());
```

### Environment-Specific Configuration

Configure logging based on environment:

```typescript
// Development: detailed, colorized console output
if (process.env.NODE_ENV === "development") {
  logger.setMinLevel("debug");
  logger.setTransports([
    new ConsoleTransport({ colorize: true, format: "pretty" }),
  ]);
}

// Production: structured JSON, higher minimum level
if (process.env.NODE_ENV === "production") {
  logger.setMinLevel("info");
  logger.setTransports([
    new ConsoleTransport({ colorize: false, format: "json" }),
    // Add additional production transports (e.g., CloudWatch, Logstash)
  ]);
}

// Test: minimal logging
if (process.env.NODE_ENV === "test") {
  logger.setMinLevel("warn");
  logger.setTransports([
    new ConsoleTransport({ silent: true }), // Silence console during tests
  ]);
}
```
