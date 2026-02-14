// main/tools/scripts/dev/logger.ts
/**
 * Development log formatting helpers.
 *
 * Shared by dev orchestration scripts so all package output
 * (turbo/web/server/db/env) follows one visual language.
 */

import process from 'node:process';

const USE_COLOR = process.stdout.isTTY;

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
} as const;

export type DevLogLevel = 'info' | 'ok' | 'warn' | 'error';

export interface NormalizedServerLine {
  handled: boolean;
  scope?: string;
  level?: DevLogLevel;
  time?: string;
  message?: string;
  passthrough?: string;
}

export function colorize(text: string, color: keyof typeof COLORS): string {
  if (!USE_COLOR) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function nowTime(): string {
  return new Date().toISOString().slice(11, 19);
}

function levelColor(level: DevLogLevel): keyof typeof COLORS {
  if (level === 'ok') return 'green';
  if (level === 'warn') return 'yellow';
  if (level === 'error') return 'red';
  return 'cyan';
}

function formatLevel(level: DevLogLevel): string {
  return level === 'ok' ? 'OK' : level.toUpperCase();
}

export function logLine(
  scope: string,
  message: string,
  level: DevLogLevel = 'info',
  timeOverride?: string,
): void {
  const time = colorize(timeOverride ?? nowTime(), 'dim');
  const lvl = colorize(formatLevel(level).padEnd(5, ' '), levelColor(level));
  const scp = colorize(scope.padEnd(8, ' '), 'cyan');
  console.log(`${time} ${lvl} ${scp} ${message}`);
}

function fromServerLevel(level: string): DevLogLevel {
  const normalized = level.toUpperCase();
  if (normalized === 'ERROR' || normalized === 'FATAL') return 'error';
  if (normalized === 'WARN') return 'warn';
  return 'info';
}

export function normalizeServerLine(message: string): NormalizedServerLine {
  if (message.startsWith('[EnvLoader] ')) {
    return {
      handled: true,
      scope: 'env',
      level: 'info',
      message: message.slice('[EnvLoader] '.length),
    };
  }

  // Handle "{", "}", or indented lines (JSON payload)
  if (message.startsWith('{') || message.startsWith('}') || message.startsWith('  ')) {
    return { handled: true, passthrough: message };
  }

  // Handle "server: [17:18:23] INFO message"
  const prefixMatch = message.match(
    /^server:\s+\[(\d{2}:\d{2}:\d{2})\]\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)(?:\s+(.*))?$/,
  );
  if (prefixMatch) {
    const [, ts, lvl, tail] = prefixMatch;
    return {
      handled: true,
      scope: 'server',
      level: fromServerLevel(lvl),
      time: ts,
      message: tail !== undefined && tail.trim() === '|' ? '' : (tail ?? '').trim(),
    };
  }

  const bracketed = message.match(
    /^\[(\d{2}:\d{2}:\d{2})\]\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\s+(.*)$/,
  );
  if (bracketed) {
    const [, ts, lvl, tail] = bracketed;
    return {
      handled: true,
      scope: 'server',
      level: fromServerLevel(lvl),
      time: ts,
      message: tail.trim() === '|' ? 'HTTP request log' : tail,
    };
  }

  if (message.startsWith('{') || message.startsWith('}') || message.startsWith('  ')) {
    return { handled: true, passthrough: message };
  }

  return {
    handled: true,
    scope: 'server',
    level: 'info',
    message,
  };
}

export function isTurboSummaryLine(line: string): boolean {
  return line.startsWith('•') || line.startsWith('Tasks:') || line.startsWith('Cached:');
}
