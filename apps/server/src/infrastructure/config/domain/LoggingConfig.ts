import { injectable } from "inversify";

import { LogLevel } from "../../logging/ILoggerService";

/**
 * Configuration options for logging
 */
export interface LoggingOptions {
  /**
   * Minimum log level to display (default: "info")
   */
  minLevel?: LogLevel | string;

  /**
   * Whether to use pretty printing in development (default: true)
   */
  prettyPrint?: boolean;

  /**
   * Console output enabled (default: true)
   */
  console?: boolean;

  /**
   * File logging configuration
   */
  file?: {
    /**
     * Enable file logging (default: false)
     */
    enabled: boolean;

    /**
     * Log directory path (default: "logs")
     */
    dir?: string;

    /**
     * Log filename pattern (default: "app-%DATE%.log")
     */
    filename?: string;

    /**
     * Maximum file size before rotation (default: "10m")
     */
    maxSize?: string;

    /**
     * Maximum number of log files to keep (default: 5)
     */
    maxFiles?: number;
  };
}

export interface LoggingConfig {
  level: LogLevel;
  prettyPrint: boolean;
  file?: {
    enabled: boolean;
    dir: string;
    filename: string;
    maxSize: number;
    maxFiles: number;
  };
}

/**
 * Logging configuration provider
 */
@injectable()
export class LoggingConfigService {
  /**
   * Get logging configuration
   */
  public getConfig(): LoggingConfig {
    const parsedLevel = this.parseLogLevel(process.env.LOG_LEVEL);
    const config: LoggingConfig = {
      level: parsedLevel !== undefined ? parsedLevel : LogLevel.INFO,
      prettyPrint: process.env.NODE_ENV !== "production",
      file: {
        enabled: process.env.LOG_TO_FILE === "true",
        dir: process.env.LOG_DIR || "logs",
        filename: process.env.LOG_FILENAME || "app.log",
        maxSize: this.parseNumber(process.env.LOG_MAX_SIZE, 10485760), // 10MB default
        maxFiles: this.parseNumber(process.env.LOG_MAX_FILES, 5), // Default to 5 if parsing fails
      },
    };

    return config;
  }

  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;

    switch (level.toLowerCase()) {
      case "debug":
        return LogLevel.DEBUG;
      case "info":
        return LogLevel.INFO;
      case "warn":
      case "warning":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      default:
        return undefined;
    }
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}
