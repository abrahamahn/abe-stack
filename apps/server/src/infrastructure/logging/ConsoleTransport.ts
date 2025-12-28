import {
  LogLevel,
  type LogEntry,
  type ILogTransport,
} from "@/server/infrastructure/logging/ILoggerService";

/**
 * Safe JSON stringification with circular reference handling
 * @param obj Object to stringify
 * @param indent Optional indentation
 * @returns JSON string or fallback string if circular references exist
 */
function safeStringify(obj: unknown, indent?: number): string {
  try {
    // Handle undefined and functions specifically
    const replacer = (_key: string, value: unknown): unknown => {
      if (typeof value === "undefined") {
        return "[undefined]";
      }
      if (typeof value === "function") {
        return `[Function: ${value.name || "anonymous"}]`;
      }
      return value;
    };

    return JSON.stringify(obj, replacer, indent);
  } catch (error) {
    // Likely a circular reference, fallback to a simple representation
    if (error instanceof Error && error.message.includes("circular")) {
      return `[Object with circular references - ${typeof obj === "object" && obj !== null ? Object.keys(obj).join(", ") : typeof obj}]`;
    }
    return `[Object that couldn't be serialized: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Formats error data in a more readable way
 * @param error Error object with message and optional stack
 * @returns Formatted error string
 */
function formatError(error: Record<string, unknown>): string {
  if (!error) return "[No error details]";

  let result = "";

  // Show error message prominently
  if (error.message && typeof error.message === "string") {
    result += `\x1b[1;31m${error.message}\x1b[0m`;

    // Add error code if present
    if (error.code) {
      result += ` \x1b[31m(${error.code})\x1b[0m`;
    }

    // Add error name if different from "Error" and not already in the message
    if (
      error.name &&
      typeof error.name === "string" &&
      error.name !== "Error" &&
      !error.message.includes(error.name)
    ) {
      result += ` \x1b[31m[${error.name}]\x1b[0m`;
    }
  }

  // Extract additional error properties that might be useful
  const skipProps = ["message", "stack", "name", "details"];
  const additionalProps = Object.entries(error)
    .filter(([key]) => !skipProps.includes(key))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );

  // Add additional properties if any exist
  if (Object.keys(additionalProps).length > 0) {
    result += `\n\n    \x1b[1mError properties:\x1b[0m`;
    Object.entries(additionalProps).forEach(([key, value]) => {
      const valueStr =
        typeof value === "object" && value !== null
          ? safeStringify(value)
          : String(value);
      result += `\n    \x1b[36m${key}:\x1b[0m ${valueStr}`;
    });
  }

  // Add detailed nested error information if available
  if (error.details && typeof error.details === "object") {
    result += `\n\n    \x1b[1mDetails:\x1b[0m`;
    Object.entries(error.details).forEach(([key, value]) => {
      const valueStr =
        typeof value === "object" && value !== null
          ? safeStringify(value)
          : String(value);
      result += `\n    \x1b[36m${key}:\x1b[0m ${valueStr}`;
    });
  }

  // Format stack trace if available
  if (error.stack && typeof error.stack === "string") {
    // Clean up the stack trace
    const stackLines = error.stack
      .split("\n")
      .map((line: string) => line.trim())
      .filter(
        (line: string) =>
          !line.includes("node_modules/@vitest") &&
          !line.includes("node:internal/") &&
          !line.startsWith("Error:") &&
          !line.includes("processTicksAndRejections"),
      ); // Skip irrelevant frames

    // Get the most relevant frames (first 4)
    const relevantFrames = stackLines.slice(0, 4);

    if (relevantFrames.length > 0) {
      // Format the stack frames with file/line highlighting
      const formattedFrames = relevantFrames.map((frame: string) => {
        // Try to extract file path and line number
        const match =
          frame.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) ||
          frame.match(/at\s+()(.*?):(\d+):(\d+)/);

        if (match) {
          const [, fnName, filePath, line, col] = match;
          const fileName = filePath.split(/[/\\]/).pop() || filePath;

          // Format with colors
          return `    \x1b[90m→ ${fnName ? `${fnName} ` : ""}(\x1b[36m${fileName}\x1b[90m:\x1b[33m${line}\x1b[90m:\x1b[33m${col}\x1b[90m)\x1b[0m`;
        }

        // Fallback if pattern not matched
        return `    \x1b[90m→ ${frame}\x1b[0m`;
      });

      result += `\n\n    \x1b[1mStack trace:\x1b[0m\n${formattedFrames.join("\n")}`;

      // Add summary of additional frames if any
      const remainingFrames = stackLines.length - relevantFrames.length;
      if (remainingFrames > 0) {
        result += `\n    \x1b[90m... ${remainingFrames} more frame${remainingFrames === 1 ? "" : "s"}\x1b[0m`;
      }
    }
  }

  return result;
}

/**
 * Console transport for logging
 * Formats and writes log entries to the console
 */
export class ConsoleTransport implements ILogTransport {
  constructor(private prettyPrint: boolean = false) {}

  log(entry: LogEntry): void {
    const formattedEntry = this.prettyPrint
      ? this.formatPretty(entry)
      : this.formatEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedEntry);
        break;
      case LogLevel.INFO:
        console.info(formattedEntry);
        break;
      case LogLevel.WARN:
        console.warn(formattedEntry);
        break;
      case LogLevel.ERROR:
        console.error(formattedEntry);
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    const service = entry.service ? `[${entry.service}]` : "";
    const correlationId = entry.correlationId ? `(${entry.correlationId})` : "";

    let output = `${entry.timestamp} ${LogLevel[entry.level]} ${service}${correlationId}: ${entry.message}`;

    // Add context if available
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` context=${safeStringify(entry.context)}`;
    }

    // Add metadata if available
    if (entry.metadata) {
      output += ` ${safeStringify(entry.metadata)}`;
    }

    // Add structured data if available
    if (entry.structuredData) {
      output += ` ${safeStringify(entry.structuredData)}`;
    }

    return output;
  }

  private formatPretty(entry: LogEntry): string {
    const service = entry.service ? ` \x1b[36m[${entry.service}]\x1b[0m` : "";
    const correlationId = entry.correlationId
      ? ` \x1b[33m(${entry.correlationId})\x1b[0m`
      : "";

    let levelColor = "";
    switch (entry.level) {
      case LogLevel.DEBUG:
        levelColor = "\x1b[34m"; // Blue
        break;
      case LogLevel.INFO:
        levelColor = "\x1b[32m"; // Green
        break;
      case LogLevel.WARN:
        levelColor = "\x1b[33m"; // Yellow
        break;
      case LogLevel.ERROR:
        levelColor = "\x1b[31m"; // Red
        break;
    }

    const levelStr = `${levelColor}${LogLevel[entry.level]}\x1b[0m`;
    const date = new Date(entry.timestamp).toLocaleTimeString();

    let output = `${date}${service}${correlationId} ${levelStr}: ${entry.message}`;

    // Add context with nice formatting if available
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  \x1b[36mContext:\x1b[0m ${safeStringify(entry.context, 2)}`;
    }

    // Add metadata with special handling for errors
    if (entry.metadata) {
      output += `\n  \x1b[35mMetadata:\x1b[0m`;

      // Check if the metadata contains an error object
      if (entry.metadata.error && typeof entry.metadata.error === "object") {
        const errorData = entry.metadata.error as {
          message?: string;
          stack?: string;
        };

        // Format the error data nicely
        const formattedError = formatError(errorData);

        // Box styling with a different approach
        output += `\n  \x1b[31m┏━━ Error ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`;
        formattedError.split("\n").forEach((line) => {
          output += `\n  \x1b[31m┃\x1b[0m ${line}`;
        });
        output += `\n  \x1b[31m┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`;

        // Add other metadata if present
        const otherMetadata = { ...entry.metadata };
        delete otherMetadata.error;

        if (Object.keys(otherMetadata).length > 0) {
          output += `\n  Other metadata: ${safeStringify(otherMetadata, 2)}`;
        }
      } else {
        // For non-error metadata, use the normal formatting
        output += ` ${safeStringify(entry.metadata, 2)}`;
      }
    }

    // Add structured data with nice formatting if available
    if (entry.structuredData) {
      output += `\n  \x1b[32mData:\x1b[0m ${safeStringify(entry.structuredData, 2)}`;
    }

    return output;
  }
}
