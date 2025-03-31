/**
 * Log levels for the logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log metadata type
 */
export interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Log context information for structured logging
 */
export interface ILogContext {
  [key: string]: string | number | boolean | null;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  correlationId?: string;
  metadata?: LogMetadata;
  context?: ILogContext;
  structuredData?: Record<string, unknown>;
}

/**
 * Log transport interface
 */
export interface ILogTransport {
  log(entry: LogEntry): void;
}

/**
 * Core logger service interface
 */
export interface ILoggerService {
  /**
   * Log a debug message
   * @param message The message to log
   * @param metadata Optional metadata to include with the log
   * @param correlationId Optional correlation ID for request tracking
   */
  debug(message: string, metadata?: LogMetadata, correlationId?: string): void;

  /**
   * Log a debug message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  debugObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void;

  /**
   * Log an info message
   * @param message The message to log
   * @param metadata Optional metadata to include with the log
   * @param correlationId Optional correlation ID for request tracking
   */
  info(message: string, metadata?: LogMetadata, correlationId?: string): void;

  /**
   * Log an info message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  infoObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void;

  /**
   * Log a warning message
   * @param message The message to log
   * @param metadata Optional metadata to include with the log
   * @param correlationId Optional correlation ID for request tracking
   */
  warn(message: string, metadata?: LogMetadata, correlationId?: string): void;

  /**
   * Log a warning message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  warnObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void;

  /**
   * Log an error message
   * @param message The message to log
   * @param metadata Optional metadata to include with the log
   * @param correlationId Optional correlation ID for request tracking
   */
  error(message: string, metadata?: LogMetadata, correlationId?: string): void;

  /**
   * Log an error message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  errorObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void;

  /**
   * Create a new child logger with a specific context
   * @param context The context name for the new logger
   * @returns A new logger instance with the specified context
   */
  createLogger(context: string): ILoggerService;

  /**
   * Create a new child logger with context data
   * @param context The context data for the new logger
   * @returns A new logger instance with the specified context
   */
  withContext(context: ILogContext): ILoggerService;

  /**
   * Add a transport to the logger
   * @param transport The transport to add
   */
  addTransport(transport: ILogTransport): void;

  /**
   * Set the transports for the logger, replacing any existing ones
   * @param transports The transports to set
   */
  setTransports(transports: ILogTransport[]): void;

  /**
   * Set the minimum log level that will be output
   * @param level The minimum log level to display
   */
  setMinLevel(level: LogLevel): void;

  /**
   * Initialize the logger
   * @returns A promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the logger, flushing any pending logs
   * @returns A promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;
}
