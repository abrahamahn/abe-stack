import {
  ILogTransport,
  LogEntry,
  LogLevel,
} from "@/server/infrastructure/logging";

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
      output += ` context=${JSON.stringify(entry.context)}`;
    }

    // Add metadata if available
    if (entry.metadata) {
      output += ` ${JSON.stringify(entry.metadata)}`;
    }

    // Add structured data if available
    if (entry.structuredData) {
      output += ` ${JSON.stringify(entry.structuredData)}`;
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
      output += `\n  \x1b[36mContext:\x1b[0m ${JSON.stringify(entry.context, null, 2)}`;
    }

    // Add metadata with nice formatting if available
    if (entry.metadata) {
      output += `\n  \x1b[35mMetadata:\x1b[0m ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    // Add structured data with nice formatting if available
    if (entry.structuredData) {
      output += `\n  \x1b[32mData:\x1b[0m ${JSON.stringify(entry.structuredData, null, 2)}`;
    }

    return output;
  }
}
