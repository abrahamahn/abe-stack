// main/shared/src/engine/logger/console.ts
/**
 * Console Logger
 *
 * Minimal, structured console logger for development.
 * Produces pretty-printed JSON logs for terminal readability.
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

const ANSI = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  magenta: '\u001B[35m',
  gray: '\u001B[90m',
  blue: '\u001B[34m',
  red: '\u001B[31m',
} as const;

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

function normalizeLevel(level: unknown): string {
  if (typeof level === 'number' && Number.isFinite(level)) {
    return levelLabel(level).toUpperCase();
  }
  if (typeof level === 'string' && level !== '') {
    const normalized = level.toUpperCase();
    if (['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(normalized)) {
      return normalized;
    }
  }
  return 'INFO';
}

function levelColor(level: string): string {
  switch (level) {
    case 'FATAL':
    case 'ERROR':
      return ANSI.red;
    case 'WARN':
      return ANSI.yellow;
    case 'INFO':
      return ANSI.blue;
    case 'DEBUG':
      return ANSI.cyan;
    case 'TRACE':
    default:
      return ANSI.gray;
  }
}

function shouldUseColors(): boolean {
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] === 'true') return true;
  return process.stdout.isTTY;
}

function colorizePrettyJson(text: string): string {
  return text.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match) => {
      if (match.endsWith(':')) {
        return `${ANSI.cyan}${match}${ANSI.reset}`;
      }
      if (match.startsWith('"')) {
        const raw = match.slice(1, -1);
        if (['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(raw)) {
          return `${levelColor(raw)}${match}${ANSI.reset}`;
        }
        return `${ANSI.green}${match}${ANSI.reset}`;
      }
      if (match === 'null') {
        return `${ANSI.gray}${match}${ANSI.reset}`;
      }
      if (match === 'true' || match === 'false') {
        return `${ANSI.magenta}${match}${ANSI.reset}`;
      }
      return `${ANSI.yellow}${match}${ANSI.reset}`;
    },
  );
}

function isCrudLog(data: LogData): boolean {
  return (
    data['req'] !== undefined ||
    data['res'] !== undefined ||
    typeof data['method'] === 'string' ||
    typeof data['path'] === 'string' ||
    typeof data['statusCode'] === 'number' ||
    typeof data['durationMs'] === 'number' ||
    typeof data['duration'] === 'number' ||
    typeof data['responseTime'] === 'number' ||
    data['msg'] === 'request' ||
    data['msg'] === 'Request completed'
  );
}

function formatStatusLine(data: LogData & { level: string }): string {
  const msg = typeof data['msg'] === 'string' && data['msg'] !== '' ? data['msg'] : 'log';
  const ignored = new Set(['level', 'time', 'pid', 'hostname', 'msg', 'v']);
  const extras = Object.entries(data)
    .filter(
      ([key, value]) =>
        !ignored.has(key) &&
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'),
    )
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');

  return `${msg}${extras !== '' ? `  ${extras}` : ''}`;
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
  let pending = '';

  function writeFormattedLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed === '') return;

    try {
      const parsed = JSON.parse(trimmed) as LogData & { level?: unknown };
      const normalized: LogData & { level: string } = {
        ...parsed,
        level: normalizeLevel(parsed.level),
      };
      const useColors = shouldUseColors();

      if (isCrudLog(normalized) || normalized['err'] !== undefined) {
        const {
          level: _level,
          time: _time,
          msg: _msg,
          pid: _pid,
          hostname: _hostname,
          v: _v,
          ...payload
        } = normalized;
        const pretty = JSON.stringify(payload, null, 2)
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n');
        process.stdout.write(`${useColors ? colorizePrettyJson(pretty) : pretty}\n\n`);
        return;
      }

      const status = formatStatusLine(normalized);
      process.stdout.write(`${status}\n`);
    } catch {
      process.stdout.write(trimmed + '\n');
    }
  }

  return {
    level,
    stream: {
      write: (chunk: string): void => {
        if (!chunk.includes('\n')) {
          writeFormattedLine(chunk);
          return;
        }

        pending += chunk;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';

        for (const line of lines) {
          writeFormattedLine(line);
        }
      },
    },
  };
}
