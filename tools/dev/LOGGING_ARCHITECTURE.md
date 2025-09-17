# ABE Stack Unified Logging Architecture

## Overview

The ABE Stack now uses a **unified logging architecture** that separates concerns between **development environment orchestration** and **server infrastructure monitoring** while providing seamless integration between both systems.

## Architecture Components

### 1. Development Environment Logger (`scripts/start-dev.js`)

**Purpose**: Orchestrates and monitors the development environment startup process

**Responsibilities**:

- Cross-platform development environment startup
- Port management and process monitoring
- Frontend and backend service coordination
- Real-time log parsing and formatting
- Development workflow management
- Environment health monitoring

**Scope**: External to the running application - manages the development environment

### 2. Server Infrastructure Logger (`src/server/infrastructure/logging/ServerLogger.ts`)

**Purpose**: Monitors and reports on server-side infrastructure status

**Responsibilities**:

- Infrastructure service status reporting
- Database connection monitoring
- Cache service status
- WebSocket client tracking
- Business service availability
- Server endpoint information
- Production-ready status displays

**Scope**: Internal to the running server - reports on application infrastructure

## Integration Points

### Structured Data Exchange

The `ServerLogger` now provides structured status data that can be consumed by the development environment logger:

```typescript
// ServerLogger provides structured data
const statusData = serverLogger.getInfrastructureStatus(services);

// Development logger can consume this data
devLogger.integrateServerStatus(statusData);
```

### Unified Logging Interface

Both loggers now use consistent logging patterns:

```typescript
// Unified log entry format
interface LogEntry {
  level: "debug" | "info" | "warn" | "error" | "success";
  service: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}
```

## Environment-Aware Display

### Development Mode

- **Visual displays**: Full colored tables and status information
- **Real-time monitoring**: Live server logs with enhanced formatting
- **Integrated dashboard**: Combined view of dev environment + server infrastructure

### Production Mode

- **Structured logging only**: JSON-formatted logs for monitoring systems
- **Minimal visual output**: Reduced console output for performance
- **Monitoring integration**: Structured data for external monitoring tools

## Usage Examples

### Development Environment Startup

```bash
# Standard development startup with enhanced logging
npm run dev

# Verbose mode with integrated infrastructure monitoring
npm run dev:verbose

# Quiet mode with minimal output
npm run dev:quiet

# JSON formatted logs for parsing
npm run dev:json
```

### Server Infrastructure Monitoring

```typescript
// In your server startup code
const serverLogger = new ServerLogger(logger);

// Display comprehensive status (dev mode only)
serverLogger.displayServerStatus(
  port,
  config,
  infrastructureServices,
  businessServices
);

// Get structured status data (always available)
const statusData = serverLogger.getInfrastructureStatus(services);
```

## Benefits of Unified Architecture

### 1. **Clear Separation of Concerns**

- Development environment management vs. server infrastructure monitoring
- External orchestration vs. internal status reporting

### 2. **Better Integration**

- Structured data exchange between systems
- Consistent logging interfaces
- Unified monitoring capabilities

### 3. **Environment Awareness**

- Appropriate output for development vs. production
- Performance-optimized production logging
- Rich development experience

### 4. **Maintainability**

- Single source of truth for each concern
- Reduced code duplication
- Clear interfaces between components

### 5. **Extensibility**

- Easy to add new monitoring capabilities
- Pluggable logging backends
- Integration with external monitoring systems

## Configuration Options

### Environment Variables

```bash
# Show server status displays in production
SHOW_SERVER_STATUS=true

# Development environment
NODE_ENV=development  # Enables visual displays

# Production environment
NODE_ENV=production   # Structured logging only
```

### Command Line Flags

```bash
--verbose    # Detailed monitoring and integrated displays
--quiet      # Minimal output, essential logs only
--json       # JSON formatted structured logs
--force      # Skip dependency checks
```

## Migration from Previous Architecture

### Before (Duplicated Logging)

- Two separate logging systems with overlapping functionality
- Inconsistent output formats
- Duplicated infrastructure monitoring code

### After (Unified Architecture)

- Clear separation of development vs. server concerns
- Consistent logging interfaces and data structures
- Integrated monitoring with structured data exchange
- Environment-aware display logic

## Future Enhancements

1. **External Monitoring Integration**: Structured data can be consumed by monitoring tools
2. **Real-time Dashboard**: Web-based dashboard consuming structured status data
3. **Alerting System**: Automated alerts based on infrastructure status changes
4. **Performance Metrics**: Enhanced performance monitoring and reporting
5. **Log Aggregation**: Integration with log aggregation services

This unified architecture provides a solid foundation for both development productivity and production monitoring while maintaining clear separation of concerns and excellent integration capabilities.
