import { injectable, unmanaged } from "inversify";

import {
  LogLevel,
  LogMetadata,
  type ILogContext,
  type LogEntry,
  type ILogTransport,
  type ILoggerService,
} from "./ILogger";
import { ConsoleTransport } from "./transports/ConsoleTransport";

/**
 * A simple logger service that implements the ILoggerService interface
 * Focuses on core logging functionality with minimal overhead
 */
@injectable()
export class LoggerService implements ILoggerService {
  private minLevel: LogLevel = LogLevel.INFO;
  private transports: ILogTransport[] = [];
  private context: string = "";
  private prettyPrint: boolean = false;
  private contextData: ILogContext = {};

  /**
   * Create a new SimpleLoggerService
   * @param context Optional context name for this logger
   * @param parent Optional parent logger to inherit settings from
   * @param contextData Optional context data for structured logging
   */
  constructor(
    @unmanaged() context: string = "",
    @unmanaged() private parent?: LoggerService,
    @unmanaged() contextData: ILogContext = {},
  ) {
    this.context = context;
    this.contextData = contextData;

    // If this is a root logger (no parent), add default console transport
    if (!parent) {
      this.prettyPrint = process.env.NODE_ENV !== "production";
      this.transports = [new ConsoleTransport(this.prettyPrint)];
    }
  }

  /**
   * Initialize the logger
   */
  public async initialize(): Promise<void> {
    // Nothing special needed for initialization
    return Promise.resolve();
  }

  /**
   * Shutdown the logger
   */
  public async shutdown(): Promise<void> {
    // Nothing special needed for shutdown
    return Promise.resolve();
  }

  /**
   * Set the minimum log level
   * @param level The minimum level to log
   */
  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param metadata Optional metadata to include
   * @param correlationId Optional correlation ID for request tracking
   */
  public debug(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.DEBUG, message, metadata, correlationId);
  }

  /**
   * Log a debug message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  public debugObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.DEBUG, obj, message, correlationId);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param metadata Optional metadata to include
   * @param correlationId Optional correlation ID for request tracking
   */
  public info(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.INFO, message, metadata, correlationId);
  }

  /**
   * Log an info message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  public infoObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.INFO, obj, message, correlationId);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param metadata Optional metadata to include
   * @param correlationId Optional correlation ID for request tracking
   */
  public warn(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.WARN, message, metadata, correlationId);
  }

  /**
   * Log a warning message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  public warnObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.WARN, obj, message, correlationId);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param metadata Optional metadata to include
   * @param correlationId Optional correlation ID for request tracking
   */
  public error(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.ERROR, message, metadata, correlationId);
  }

  /**
   * Log an error message with structured data
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID for request tracking
   */
  public errorObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.ERROR, obj, message, correlationId);
  }

  /**
   * Create a new child logger with a specific context
   * @param context The context name for the new logger
   * @returns A new logger instance with the specified context
   */
  public createLogger(context: string): ILoggerService {
    const newContext = this.context ? `${this.context}.${context}` : context;
    return new LoggerService(newContext, this);
  }

  /**
   * Create a new child logger with context data
   * @param context The context data for the new logger
   * @returns A new logger instance with the specified context
   */
  public withContext(context: ILogContext): ILoggerService {
    return new LoggerService(this.context, this, {
      ...this.contextData,
      ...context,
    });
  }

  /**
   * Log a message with the provided level
   * @param level Log level
   * @param message Message to log
   * @param metadata Optional metadata
   * @param correlationId Optional correlation ID
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    // Skip if below minimum level
    if (level < this.getMinLevel()) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.context,
      correlationId,
      metadata,
      context:
        Object.keys(this.contextData).length > 0 ? this.contextData : undefined,
    };

    // If this is a child logger, use parent's transports
    if (this.parent) {
      this.parent.writeLog(entry);
    } else {
      this.writeLog(entry);
    }
  }

  /**
   * Log a structured data object with the provided level
   * @param level Log level
   * @param obj Structured data object to log
   * @param message Optional message to accompany the structured data
   * @param correlationId Optional correlation ID
   */
  private logObj(
    level: LogLevel,
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    // Skip if below minimum level
    if (level < this.getMinLevel()) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message || "Structured log entry",
      service: this.context,
      correlationId,
      structuredData: obj,
      context:
        Object.keys(this.contextData).length > 0 ? this.contextData : undefined,
    };

    // If this is a child logger, use parent's transports
    if (this.parent) {
      this.parent.writeLog(entry);
    } else {
      this.writeLog(entry);
    }
  }

  /**
   * Write a log entry to all transports
   * @param entry The log entry to write
   */
  private writeLog(entry: LogEntry): void {
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        // Log transport errors to console to avoid infinite recursion
        console.error("Error writing to log transport:", error);
      }
    }
  }

  /**
   * Get the minimum log level to display
   */
  private getMinLevel(): LogLevel {
    // If this is a child logger, use parent's min level
    if (this.parent) {
      return this.parent.getMinLevel();
    }
    return this.minLevel;
  }

  /**
   * Add a transport to the logger
   * @param transport The transport to add
   */
  public addTransport(transport: ILogTransport): void {
    // Only add transports to the root logger
    if (this.parent) {
      this.parent.addTransport(transport);
    } else {
      this.transports.push(transport);
    }
  }

  /**
   * Set the transports for the logger, replacing any existing ones
   * @param transports The transports to set
   */
  public setTransports(transports: ILogTransport[]): void {
    // Only set transports on the root logger
    if (this.parent) {
      this.parent.setTransports(transports);
    } else {
      this.transports = transports;
    }
  }
}
