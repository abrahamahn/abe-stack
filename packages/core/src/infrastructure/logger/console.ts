// packages/core/src/infrastructure/logger/console.ts
/**
 * Console Logger
 *
 * Minimal, structured console logger for development.
 * Produces compact single-line logs similar to "server: ..." style.
 */

import type { LogLevel } from './types';

/**
 * Console-specific log level that extends the base LogLevel
 * with a 'silent' option for suppressing all output.
 */
export type ConsoleLogLevel = LogLevel | 'silent';

/**
 * Structured log data used internally by the console logger's write function.
 */
interface LogData {
  [key: string]: unknown;
}

/**
 * Configuration for the console logger stream.
 *
 * @property level - The minimum log level to output (includes 'silent')
 * @property stream - A writable stream that receives formatted log lines
 */
export interface ConsoleLoggerConfig {
  level: ConsoleLogLevel;
  stream: {
    write: (chunk: string) => void;
  };
}

/**
 * Extended log levels for the console logger, including 'silent' (severity 100).
 * Use this when you need the console-specific levels that include 'silent'.
 * For standard log levels without 'silent', use `LOG_LEVELS` from `./levels`.
 */
export const CONSOLE_LOG_LEVELS: Record<ConsoleLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

/**
 * Format the current time as HH:MM:SS.
 *
 * @returns Formatted timestamp string
 */
function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Format a single value for log output.
 * Strings with spaces are JSON-quoted, primitives are stringified,
 * objects are JSON-serialized (truncated at 200 chars).
 *
 * @param value - The value to format
 * @returns Formatted string representation
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return value.includes(' ') ? JSON.stringify(value) : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Error) {
    return JSON.stringify(value.message);
  }
  try {
    const text = JSON.stringify(value);
    return text.length > 200 ? `${text.slice(0, 197)}...` : text;
  } catch {
    return '[unserializable]';
  }
}

/**
 * Format structured log data as key=value pairs.
 * Filters out undefined values and internal pino fields
 * (msg, level, time, pid, hostname, v).
 *
 * @param data - Optional log data to format
 * @returns Formatted key=value string, or empty string if no data
 */
function formatData(data?: LogData): string {
  if (data === undefined) return '';
  const entries = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .filter(([key]) => !['msg', 'level', 'time', 'pid', 'hostname', 'v'].includes(key));
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}=${formatValue(value)}`).join(' ');
}

/**
 * Convert a numeric pino log level to a string label.
 *
 * @param level - Numeric log level (10-60)
 * @returns The string label for the level
 */
function levelLabel(level: number): LogLevel {
  if (level >= 60) return 'fatal';
  if (level >= 50) return 'error';
  if (level >= 40) return 'warn';
  if (level >= 30) return 'info';
  if (level >= 20) return 'debug';
  return 'trace';
}

/**
 * Create a console logger configuration for pino.
 * The returned config provides a custom stream that formats pino's
 * JSON output into compact, human-readable single-line logs.
 *
 * @param level - The minimum log level to configure
 * @returns A ConsoleLoggerConfig with level and formatted stream
 *
 * @example
 * ```typescript
 * const loggerConfig = createConsoleLogger('info');
 * // Use with pino/Fastify:
 * // const server = fastify({ logger: { level: loggerConfig.level, stream: loggerConfig.stream } });
 * ```
 */
export function createConsoleLogger(level: ConsoleLogLevel): ConsoleLoggerConfig {
  return {
    level,
    stream: {
      write: (chunk: string): void => {
        const line = chunk.trim();
        if (line === '') return;
        try {
          const parsed = JSON.parse(line) as LogData & { level?: number; msg?: string };
          const lvl = levelLabel(parsed.level ?? 30);
          const message = parsed.msg ?? '';
          const payload = formatData(parsed);
          const formatted = `server: [${formatTimestamp()}] ${lvl.toUpperCase()}${
            message !== '' ? ` ${message}` : ''
          }${payload !== '' ? ` ${payload}` : ''}`;
          process.stdout.write(formatted + '\n');
        } catch {
          process.stdout.write(line + '\n');
        }
      },
    },
  };
}
