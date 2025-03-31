# PERN Stack Infrastructure Layer Documentation

## Overview

This document provides an overview of the core infrastructure components in the PERN (PostgreSQL, Express, React, Node.js) stack boilerplate. The infrastructure layer consists of approximately 17,000 lines of TypeScript code organized into 112 files, providing essential services like configuration management, logging, database connectivity, caching, error handling, and more.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Core Infrastructure Services](#core-infrastructure-services)
  - [Configuration Management](#configuration-management)
  - [Logging System](#logging-system)
  - [Database Connectivity](#database-connectivity)
  - [Caching Service](#caching-service)
  - [Error Handling](#error-handling)
  - [Background Jobs](#background-jobs)
  - [Storage Service](#storage-service)
  - [WebSocket Service](#websocket-service)
  - [Dependency Injection](#dependency-injection)
- [Utility Services](#utility-services)
  - [Media Processing](#media-processing)
  - [Stream Processing](#stream-processing)
- [Server Management](#server-management)

## Directory Structure

The infrastructure layer is organized into several directories, each handling a specific cross-cutting concern:

```
infrastructure/
├── cache/           # Caching service
├── config/          # Configuration management
├── database/        # Database connectivity
├── di/              # Dependency injection container
├── errors/          # Error handling & types
├── jobs/            # Background job processing
├── logging/         # Logging services
├── processor/       # Media & stream processing
├── pubsub/          # WebSocket/real-time communication
├── server/          # Server lifecycle management
├── storage/         # File storage abstraction
└── utils/           # Shared utilities
```

## Core Infrastructure Services

### Configuration Management

The configuration system provides a flexible way to manage application settings across different environments.

#### Key Features:

- **Environment-Based Configuration**: Loads configuration from environment variables and `.env` files with cascading priority:

  - `.env.{environment}.local` (highest priority)
  - `.env.{environment}`
  - `.env.local`
  - `.env` (lowest priority)

- **Schema Validation**: Validates configuration values against defined schemas to catch errors early:

  ```typescript
  export function validateConfig(
    config: Record<string, string>,
    schema: ConfigSchema,
  ): ValidatedConfig {
    // Validation logic
  }
  ```

- **Namespaced Configuration**: Supports grouping related settings into namespaces:

  ```typescript
  const dbConfig = configService.getNamespace("database");
  ```

- **Secret Management**: Handles sensitive configuration values through specialized providers:

  ```typescript
  export interface SecretProvider {
    supportsSecret(key: string): Promise<boolean>;
    getSecret(key: string): Promise<string | undefined>;
  }
  ```

- **Type Safety**: Uses TypeScript to provide type-safe access to configuration values:
  ```typescript
  getNumber(key: string, defaultValue?: number): number
  getBoolean(key: string, defaultValue?: boolean): boolean
  getString(key: string, defaultValue?: string): string
  getArray<T>(key: string, defaultValue?: T[]): T[]
  ```

### Logging System

The logging system provides comprehensive, structured logging with context support and multiple output targets.

#### Key Features:

- **Log Levels**: Supports multiple log levels (debug, info, warn, error) with minimum level filtering:

  ```typescript
  debug(message: string, metadata?: LogMetadata): void
  info(message: string, metadata?: LogMetadata): void
  warn(message: string, metadata?: LogMetadata): void
  error(message: string, metadata?: LogMetadata): void
  ```

- **Hierarchical Loggers**: Creates parent-child relationships between loggers to inherit settings:

  ```typescript
  createLogger(context: string): ILoggerService
  ```

- **Structured Logging**: Supports both message-based and structured data logging:

  ```typescript
  debugObj(obj: Record<string, unknown>, message?: string): void
  infoObj(obj: Record<string, unknown>, message?: string): void
  warnObj(obj: Record<string, unknown>, message?: string): void
  errorObj(obj: Record<string, unknown>, message?: string): void
  ```

- **Context-Aware Logging**: Adds context information to log entries:

  ```typescript
  withContext(context: ILogContext): ILoggerService
  ```

- **Multiple Outputs**: Supports multiple log destinations through transport abstraction:

  ```typescript
  export interface ILogTransport {
    log(entry: LogEntry): void;
  }
  ```

- **Pretty Printing**: Formats logs for readability during development:
  ```typescript
  private formatPretty(entry: LogEntry): string {
    // Pretty printing logic
  }
  ```

### Database Connectivity

The database service abstracts PostgreSQL connectivity, providing a clean interface for database operations.

#### Key Features:

- **Connection Pooling**: Manages database connections efficiently:

  ```typescript
  private pool: Pool | null = null;
  ```

- **Query Execution**: Executes SQL queries with parameter support:

  ```typescript
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    // Query execution logic
  }
  ```

- **Transaction Management**: Supports database transactions with isolation levels and retry logic:

  ```typescript
  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    // Transaction logic
  }
  ```

- **Query Builder**: Provides a fluent interface for constructing type-safe queries:

  ```typescript
  let query = db
    .createQueryBuilder("users")
    .select(["id", "name", "email"])
    .where("active = ?", true)
    .orderBy("created_at", "DESC")
    .limit(10);

  let users = await query.getMany();
  ```

- **Performance Metrics**: Collects metrics on database usage:
  ```typescript
  getStats(reset: boolean = false): ConnectionStats {
    // Statistics collection logic
  }
  ```

### Caching Service

The caching service provides in-memory storage with expiration support.

#### Key Features:

- **Generic Interface**: Type-safe cache operations:

  ```typescript
  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean>
  async delete(key: string): Promise<boolean>
  ```

- **Multiple Item Operations**: Batch operations for efficiency:

  ```typescript
  async getMultiple<T>(keys: string[]): Promise<Record<string, T>>
  async setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<boolean>
  async deleteMultiple(keys: string[]): Promise<boolean>
  ```

- **Function Memoization**: Automatically caches function results:

  ```typescript
  memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
      ttl?: number | ((result: Awaited<ReturnType<T>>, executionTime: number) => number);
      keyFn?: (...args: unknown[]) => string;
    }
  ): T
  ```

- **Performance Metrics**: Tracks cache effectiveness:

  ```typescript
  getStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRatio: number;
  }
  ```

- **Expiration Management**: Automatically removes expired entries:
  ```typescript
  private cleanExpired(): void {
    // Clean expired entries logic
  }
  ```

### Error Handling

The error system provides a comprehensive approach to error classification, handling, and reporting.

#### Key Features:

- **Error Hierarchy**: Categorizes errors by type and domain:

  ```
  AppError
  ├── ServiceError
  ├── DomainError
  │   ├── DomainNotFoundError
  │   ├── DomainValidationError
  │   └── DomainBusinessRuleError
  ├── InfrastructureError
  │   ├── DatabaseError
  │   ├── ValidationError
  │   └── NetworkError
  └── TechnicalError
      ├── ConfigurationError
      ├── InitializationError
      └── SystemError
  ```

- **Domain-Specific Errors**: Each domain has specialized error types:

  ```typescript
  export class UserNotFoundError extends NotFoundError {
    constructor(userId: string) {
      super(userId);
      this.message = `User not found: ${userId}`;
      this.code = "USER_NOT_FOUND";
    }
  }
  ```

- **Error Factory Functions**: Convenient creation of common error types:

  ```typescript
  export const UserErrors = {
    NotFound: UserNotFoundError,
    Validation: UserValidationError,
    Operation: UserOperationError,
    // More error types
  };
  ```

- **Middleware Integration**: Express middleware for handling errors in API requests:

  ```typescript
  handleError = (error: Error, req: Request, res: Response): Response => {
    // Error handling logic
    return res.status(statusCode).json(errorResponse);
  };
  ```

- **Status Code Mapping**: Maps error types to appropriate HTTP status codes:

  ```typescript
  const statusCode = error.statusCode || 500;
  ```

- **Error Sanitization**: Removes sensitive information from error responses in production:
  ```typescript
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json(errorResponse);
  }
  ```

### Background Jobs

The job system provides a framework for executing tasks asynchronously with durability and retry support.

#### Key Features:

- **Job Queue Interface**: Manages asynchronous task execution:

  ```typescript
  addJob<T>(type: JobType, data: T, options?: JobOptions): Promise<string>
  registerProcessor<T>(type: JobType, processor: JobProcessor<T>): void
  pauseQueue(type: JobType): Promise<void>
  resumeQueue(type: JobType): Promise<void>
  getStats(type: JobType): Promise<JobStats>
  ```

- **Job Storage**: Persists jobs for durability:

  ```typescript
  export interface IJobStorage {
    saveJob<T>(job: JobData<T>): Promise<void>;
    getJob<T>(type: JobType, id: string): Promise<JobData<T> | null>;
    getJobsByStatus<T>(
      type: JobType,
      status: JobStatus,
      limit?: number,
    ): Promise<JobData<T>[]>;
    // Other methods
  }
  ```

- **Job Dependencies**: Jobs can depend on completion of other jobs:

  ```typescript
  chainJob<T>(type: JobType, data: T, dependsOnJobId: string, options?: JobOptions): Promise<string>
  ```

- **Retry Logic**: Configurable retry behavior for failed jobs:

  ```typescript
  private calculateBackoff(job: JobData): number {
    // Backoff calculation logic
  }
  ```

- **Job Prioritization**: Jobs can be assigned different priority levels:

  ```typescript
  export enum JobPriority {
    LOWEST = 20,
    LOW = 10,
    NORMAL = 0,
    MEDIUM = -5,
    HIGH = -10,
    CRITICAL = -15,
    URGENT = -20,
  }
  ```

- **Job Status Management**: Tracks job progress through different states:
  ```typescript
  export type JobStatus =
    | "waiting"
    | "active"
    | "completed"
    | "failed"
    | "delayed"
    | "blocked";
  ```

### Storage Service

The storage service provides a unified interface for file operations with media processing capabilities.

#### Key Features:

- **Provider Abstraction**: Interface for different storage backends:

  ```typescript
  export interface IStorageProvider {
    saveFile(
      path: string,
      data: FileData,
      options?: StorageSaveOptions,
    ): Promise<FileSaveResult>;
    getFile(path: string): Promise<Buffer>;
    getFileStream(path: string, options?: StreamOptions): Promise<ReadStream>;
    getFileMetadata(path: string): Promise<FileMetadata>;
    deleteFile(path: string): Promise<boolean>;
    fileExists(path: string): Promise<boolean>;
    listFiles(directory: string, pattern?: string): Promise<string[]>;
    // Other methods
  }
  ```

- **Media Processing**: Specialized handling for media files:

  ```typescript
  export class MediaProcessor {
    async processMedia(
      sourcePath: string,
      targetPath: string,
      options: MediaOptions = {},
    ): Promise<MediaProcessingResult> {
      // Processing logic
    }
  }
  ```

- **Stream Support**: Efficient handling of large files:

  ```typescript
  getFileStream(path: string, options?: StreamOptions): Promise<ReadStream>
  ```

- **Metadata Handling**: Extracts and manages file metadata:

  ```typescript
  getFileMetadata(path: string): Promise<FileMetadata>
  ```

- **Content Type Detection**: Automatically identifies file types:

  ```typescript
  detectContentType(filePath: string): string
  ```

- **URL Generation**: Creates public URLs for files:
  ```typescript
  getFileUrl(path: string, expiresIn?: number): Promise<string>
  ```

### WebSocket Service

The WebSocket service provides real-time communication capabilities with channels and authentication.

#### Key Features:

- **Client Management**: Tracks connected clients:

  ```typescript
  private clients: Map<string, ClientConnection> = new Map();
  ```

- **Channel-Based Messaging**: Pub-sub messaging patterns:

  ```typescript
  async publish(
    channel: string,
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions
  ): Promise<number> {
    // Publishing logic
  }
  ```

- **Subscription Management**: Manages client subscriptions to channels:

  ```typescript
  subscribe(clientId: string, channel: string): boolean
  unsubscribe(clientId: string, channel: string): boolean
  getClientChannels(clientId: string): Set<string>
  getChannelClients(channel: string): Set<string>
  ```

- **Authentication**: Authenticates WebSocket connections:

  ```typescript
  async authenticateClient(
    clientId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    // Authentication logic
  }
  ```

- **Presence Tracking**: Basic user presence functionality:

  ```typescript
  async setPresence(
    userId: string,
    status: "online" | "offline",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Presence tracking logic
  }
  ```

- **Message Acknowledgment**: Confirms message delivery:
  ```typescript
  private async sendMessageWithAck(
    client: ClientConnection,
    message: WebSocketMessage,
    options?: WebSocketMessageOptions
  ): Promise<boolean> {
    // Acknowledgment logic
  }
  ```

### Dependency Injection

The dependency injection system uses InversifyJS to manage service lifecycles and dependencies.

#### Key Features:

- **Container Management**: Centralized service registration and resolution:

  ```typescript
  export function createContainer(
    options: { cacheKey?: string } = {},
  ): Container {
    // Container creation logic
  }
  ```

- **Interface-Based Injection**: Services are defined by interfaces:

  ```typescript
  container.bind<ICacheService>(TYPES.CacheService).to(CacheService);
  ```

- **Lifecycle Management**: Controls service instantiation and lifecycles:

  ```typescript
  container
    .bind<LoggerService>(TYPES.LoggerService)
    .to(LoggerService)
    .inSingletonScope();
  ```

- **Decorator Support**: Uses TypeScript decorators for DI:

  ```typescript
  @injectable()
  export class CacheService implements ICacheService {
    constructor(
      @inject(TYPES.LoggerService) private readonly logger: ILoggerService,
    ) {}

    // Implementation
  }
  ```

- **Type Safety**: Leverages TypeScript for type-safe dependency resolution:
  ```typescript
  const logger = container.get<ILoggerService>(TYPES.LoggerService);
  ```

## Utility Services

### Media Processing

The media processing services handle image, video, and audio processing tasks.

#### Key Features:

- **Image Processing**: Image manipulation and optimization:

  ```typescript
  export class ImageProcessor {
    async process(
      sourcePath: string,
      targetPath: string,
      options: ImageOptions = {},
    ): Promise<ImageMetadata> {
      // Image processing logic
    }
  }
  ```

- **Thumbnail Generation**: Creates thumbnails for images and videos:

  ```typescript
  async generateThumbnail(
    sourcePath: string,
    targetPath: string,
    size: number = 200
  ): Promise<string> {
    // Thumbnail generation logic
  }
  ```

- **Video Processing**: Transcodes and optimizes videos:

  ```typescript
  private async transcodeVideo(
    sourcePath: string,
    targetPath: string,
    options: MediaOptions
  ): Promise<void> {
    // Video transcoding logic
  }
  ```

- **Format Conversion**: Converts media between different formats:
  ```typescript
  private getOutputContentType(originalType: string, format?: string): string {
    // Format conversion logic
  }
  ```

### Stream Processing

The stream processing utility handles efficient data streaming operations.

#### Key Features:

- **Stream Creation**: Creates read and write streams:

  ```typescript
  static createReadStream(
    filePath: string,
    options?: StreamOptions
  ): ReadStream {
    // Stream creation logic
  }
  ```

- **Stream Pipeline**: Processes data through transform streams:

  ```typescript
  static async processStream(
    source: Readable | string,
    destination: Writable | string,
    transforms: Transform[] = []
  ): Promise<StreamStats> {
    // Stream processing logic
  }
  ```

- **Throttling**: Controls data flow rates:

  ```typescript
  static createThrottleTransform(bytesPerSecond: number): Transform {
    // Throttling logic
  }
  ```

- **Progress Tracking**: Reports stream processing progress:
  ```typescript
  static createProgressTransform(
    progressCallback: (progress: number, bytes: number) => void,
    totalSize?: number
  ): Transform {
    // Progress tracking logic
  }
  ```

## Server Management

The server manager handles server initialization, port allocation, and lifecycle management.

#### Key Features:

- **Server Initialization**: Sets up HTTP and WebSocket servers:

  ```typescript
  async initialize(config: ServerConfig): Promise<void> {
    // Server initialization logic
  }
  ```

- **Port Allocation**: Finds available ports:

  ```typescript
  async findAvailablePort(preferredPort: number): Promise<number> {
    // Port finding logic
  }
  ```

- **Service Loading**: Loads required services from DI container:

  ```typescript
  async loadServices(): Promise<void> {
    // Service loading logic
  }
  ```

- **Express Configuration**: Configures the Express application:

  ```typescript
  configureApp(config: ServerConfig): void {
    // Express configuration logic
  }
  ```

- **Graceful Shutdown**: Handles application shutdown:

  ```typescript
  setupGracefulShutdown(): void {
    // Shutdown logic
  }
  ```

- **Status Display**: Shows server status information:
  ```typescript
  displayServerStatus(): void {
    // Status display logic
  }
  ```
