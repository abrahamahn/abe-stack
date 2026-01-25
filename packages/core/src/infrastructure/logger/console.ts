// packages/core/src/infrastructure/logger/console.ts
/**
 * Console Logger
 *
 * Minimal, structured console logger for development.
 * Produces compact single-line logs similar to "server: ..." style.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

export interface LogData {
  [key: string]: unknown;
}

export interface ConsoleLoggerConfig {
  level: LogLevel;
  stream: {
    write: (chunk: string) => void;
  };
}

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

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

function formatData(data?: LogData): string {
  if (!data) return '';
  const entries = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .filter(([key]) => !['msg', 'level', 'time', 'pid', 'hostname', 'v'].includes(key));
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}=${formatValue(value)}`).join(' ');
}

function levelLabel(level: number): LogLevel {
  if (level >= 60) return 'fatal';
  if (level >= 50) return 'error';
  if (level >= 40) return 'warn';
  if (level >= 30) return 'info';
  if (level >= 20) return 'debug';
  return 'trace';
}

export function createConsoleLogger(level: LogLevel): ConsoleLoggerConfig {
  return {
    level,
    stream: {
      write: (chunk: string): void => {
        const line = chunk.trim();
        if (!line) return;
        try {
          const parsed = JSON.parse(line) as LogData & { level?: number; msg?: string };
          const lvl = levelLabel(parsed.level ?? 30);
          const message = parsed.msg ?? '';
          const payload = formatData(parsed);
          const formatted = `server: [${formatTimestamp()}] ${lvl.toUpperCase()}${
            message ? ` ${message}` : ''
          }${payload ? ` ${payload}` : ''}`;
          process.stdout.write(formatted + '\n');
        } catch {
          process.stdout.write(line + '\n');
        }
      },
    },
  };
}
