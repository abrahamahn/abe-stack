import { injectable } from "inversify";

import { LogLevel } from "./ILogger";

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

/**
 * Logging configuration provider
 */
@injectable()
export class LoggingConfig {
  /**
   * Get logging configuration
   */
  public getConfig(): LoggingOptions {
    // Parse log level string to enum if needed
    let minLevel: LogLevel | string = process.env.LOG_LEVEL || "info";
    if (typeof minLevel === "string") {
      switch (minLevel.toLowerCase()) {
        case "debug":
          minLevel = LogLevel.DEBUG;
          break;
        case "info":
          minLevel = LogLevel.INFO;
          break;
        case "warn":
        case "warning":
          minLevel = LogLevel.WARN;
          break;
        case "error":
          minLevel = LogLevel.ERROR;
          break;
      }
    }

    return {
      minLevel,
      prettyPrint: process.env.NODE_ENV !== "production",
      console: true,
      file: {
        enabled: process.env.LOG_TO_FILE === "true",
        dir: process.env.LOG_DIR || "logs",
        filename: process.env.LOG_FILENAME || "app-%DATE%.log",
        maxSize: process.env.LOG_MAX_SIZE || "10m",
        maxFiles: parseInt(process.env.LOG_MAX_FILES || "5", 10),
      },
    };
  }
}
