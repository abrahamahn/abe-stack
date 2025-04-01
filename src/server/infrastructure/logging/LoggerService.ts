import { injectable, unmanaged } from "inversify";

import { ConsoleTransport } from "./ConsoleTransport";
import {
  LogLevel,
  type LogEntry,
  type LogMetadata,
  type ILogTransport,
  type ILogContext,
  type ILoggerService,
} from "./ILoggerService";

/**
 * A simple logger service implementation
 */
@injectable()
export class LoggerService implements ILoggerService {
  private _transports: ILogTransport[] = [];
  private _minLevel: LogLevel = LogLevel.INFO;
  private _serviceName: string;
  private _contextData: ILogContext;
  private _parent: LoggerService | null = null;

  constructor(
    @unmanaged() serviceName: string = "",
    @unmanaged() parent: LoggerService | null = null,
    @unmanaged() contextData: ILogContext = {},
  ) {
    this._serviceName = serviceName;
    this._contextData = { ...contextData };
    this._parent = parent;

    // Initialize with default transport if this is a root logger
    if (!parent) {
      const prettyPrint = process.env.NODE_ENV !== "production";
      this._transports = [new ConsoleTransport(prettyPrint)];
    }
  }

  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  public async shutdown(): Promise<void> {
    return Promise.resolve();
  }

  public setMinLevel(level: LogLevel): void {
    this._minLevel = level;
  }

  public setContext(context: string): void {
    this._serviceName = context;
  }

  public setContextData(data: ILogContext): void {
    this._contextData = { ...data };
  }

  public debug(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.DEBUG, message, metadata, correlationId);
  }

  public debugObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.DEBUG, obj, message, correlationId);
  }

  public info(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.INFO, message, metadata, correlationId);
  }

  public infoObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.INFO, obj, message, correlationId);
  }

  public warn(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.WARN, message, metadata, correlationId);
  }

  public warnObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.WARN, obj, message, correlationId);
  }

  public error(
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    this.log(LogLevel.ERROR, message, metadata, correlationId);
  }

  public errorObj(
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    this.logObj(LogLevel.ERROR, obj, message, correlationId);
  }

  public createLogger(context: string): ILoggerService {
    // Create a properly formatted nested context name
    const newContext = this._serviceName
      ? `${this._serviceName}.${context}`
      : context;

    // Create a new logger with this as parent
    return new LoggerService(newContext, this, { ...this._contextData });
  }

  public withContext(context: ILogContext): ILoggerService {
    // Create a new logger with merged context
    const newContextData = {
      ...this._contextData,
      ...context,
    };

    // Use the current service name and either the current parent or self as parent
    return new LoggerService(this._serviceName, this, newContextData);
  }

  public addTransport(transport: ILogTransport): void {
    // If this is a child logger, add transport to root logger
    if (this._parent) {
      // Find the root parent and add transport there
      let rootLogger: LoggerService = this._parent;
      while (rootLogger._parent) {
        rootLogger = rootLogger._parent;
      }
      rootLogger._transports.push(transport);
    } else {
      // This is a root logger, add transport directly
      this._transports.push(transport);
    }
  }

  public setTransports(transports: ILogTransport[]): void {
    // If this is a child logger, set transports on root logger
    if (this._parent) {
      // Find the root parent and set transports there
      let rootLogger: LoggerService = this._parent;
      while (rootLogger._parent) {
        rootLogger = rootLogger._parent;
      }
      rootLogger._transports = [...transports];
    } else {
      // This is a root logger, set transports directly
      this._transports = [...transports];
    }
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    correlationId?: string,
  ): void {
    // Get the effective min level (from root logger if this is a child)
    const effectiveMinLevel = this.getEffectiveMinLevel();

    // Skip if below minimum level
    if (level < effectiveMinLevel) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this._serviceName,
      correlationId,
      metadata,
    };

    // Add context data if available
    if (Object.keys(this._contextData).length > 0) {
      entry.context = { ...this._contextData };
    }

    // Write to transports (either own or root)
    this.writeToTransports(entry);
  }

  private logObj(
    level: LogLevel,
    obj: Record<string, unknown>,
    message?: string,
    correlationId?: string,
  ): void {
    // Get the effective min level (from root logger if this is a child)
    const effectiveMinLevel = this.getEffectiveMinLevel();

    // Skip if below minimum level
    if (level < effectiveMinLevel) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message || "Structured log entry",
      service: this._serviceName,
      correlationId,
      structuredData: obj,
    };

    // Add context data if available
    if (Object.keys(this._contextData).length > 0) {
      entry.context = { ...this._contextData };
    }

    // Write to transports (either own or root)
    this.writeToTransports(entry);
  }

  private getEffectiveMinLevel(): LogLevel {
    // If this is a child logger, use the root logger's min level
    if (this._parent) {
      let rootLogger: LoggerService = this._parent;
      while (rootLogger._parent) {
        rootLogger = rootLogger._parent;
      }
      return rootLogger._minLevel;
    }

    // This is a root logger, use own min level
    return this._minLevel;
  }

  private writeToTransports(entry: LogEntry): void {
    try {
      // If this is a child logger, use the root logger's transports
      if (this._parent) {
        let rootLogger: LoggerService = this._parent;
        while (rootLogger._parent) {
          rootLogger = rootLogger._parent;
        }

        // Ensure the root logger has at least one transport
        if (rootLogger._transports.length === 0) {
          const prettyPrint = process.env.NODE_ENV !== "production";
          rootLogger._transports = [new ConsoleTransport(prettyPrint)];
        }

        // Write to all transports of the root logger
        rootLogger._transports.forEach((transport) => {
          try {
            transport.log(entry);
          } catch (error) {
            console.error("Error in log transport:", error);
          }
        });
      } else {
        // This is a root logger, use own transports

        // Ensure there's at least one transport
        if (this._transports.length === 0) {
          const prettyPrint = process.env.NODE_ENV !== "production";
          this._transports = [new ConsoleTransport(prettyPrint)];
        }

        // Write to all transports
        this._transports.forEach((transport) => {
          try {
            transport.log(entry);
          } catch (error) {
            console.error("Error in log transport:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error in logger:", error);
    }
  }
}
