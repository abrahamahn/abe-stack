#!/usr/bin/env tsx
// src/tools/scripts/dev/dev.ts
/**
 * Development server startup script.
 *
 * Runs all sync watchers silently in background, then starts turbo dev.
 *
 * Usage:
 *   pnpm dev              # Start server + web
 *   pnpm dev:desktop      # Start server + desktop
 *   pnpm dev:all          # Start server + web + desktop
 *   pnpm dev server       # Start server only
 */

import { execSync, spawn } from 'child_process';
import { Socket } from 'node:net';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';

import { buildConnectionString, canReachDatabase } from '@abe-stack/db';
import { loadServerEnv } from '@abe-stack/server-engine';

import type { ChildProcess } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const USE_COLOR = process.stdout.isTTY;

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
} as const;

type LogLevel = 'info' | 'ok' | 'warn' | 'error';

function colorize(text: string, color: keyof typeof COLORS): string {
  if (!USE_COLOR) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function nowTime(): string {
  return new Date().toISOString().slice(11, 19);
}

function levelColor(level: LogLevel): keyof typeof COLORS {
  if (level === 'ok') return 'green';
  if (level === 'warn') return 'yellow';
  if (level === 'error') return 'red';
  return 'cyan';
}

function formatLevel(level: LogLevel): string {
  return level === 'ok' ? 'OK' : level.toUpperCase();
}

function logLine(scope: string, message: string, level: LogLevel = 'info'): void {
  const time = colorize(nowTime(), 'dim');
  const lvl = colorize(formatLevel(level).padEnd(5, ' '), levelColor(level));
  const scp = colorize(scope.padEnd(8, ' '), 'cyan');
  console.log(`${time} ${lvl} ${scp} ${message}`);
}

function logHeader(title: string, subtitle?: string): void {
  const line = '------------------------------------------------------------------------';
  console.log(colorize(line, 'dim'));
  logLine('dev', title, 'ok');
  if (subtitle) logLine('dev', subtitle);
  console.log(colorize(line, 'dim'));
}

function centerLine(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
}

function renderStartupBanner(filters: string[]): void {
  const title = 'ABE Stack';
  const subtitle = 'Development Environment';
  const mode =
    filters.length > 0
      ? `Mode: ${filters.map((f) => `@abe-stack/${f}`).join(' + ')}`
      : 'Mode: full workspace';
  const hint = 'Press Ctrl+C to stop all dev processes';
  const timestamp = `Started: ${new Date().toLocaleString()}`;

  const content = [title, subtitle, '', mode, timestamp, '', hint];

  const maxTextLength = content.reduce((max, line) => Math.max(max, line.length), 0);
  const innerWidth = maxTextLength + 4; // compact horizontal padding
  const width = innerWidth + 4;

  const topBottom = colorize(`+${'-'.repeat(width - 2)}+`, 'cyan');
  const emptyLine = colorize(`| ${' '.repeat(innerWidth)} |`, 'dim');

  const contentLines = content.map((line) => {
    const centered = centerLine(line, innerWidth);
    const framed = `| ${centered} |`;
    if (line === title) return colorize(framed, 'green');
    if (line === subtitle) return colorize(framed, 'cyan');
    if (line === mode || line === timestamp || line === hint) return colorize(framed, 'dim');
    return colorize(framed, 'dim');
  });

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(`${topBottom}\n`);
  for (const line of contentLines) process.stdout.write(`${line}\n`);
  process.stdout.write(`${emptyLine}\n`);
  process.stdout.write(`${topBottom}\n\n`);
}

/**
 * Kill process using the specified port.
 * Works on Linux, macOS, and WSL (and best-effort on Windows).
 */
function killPort(port: number): void {
  try {
    const portStr = String(port);
    const command =
      process.platform === 'win32'
        ? `netstat -ano | findstr :${portStr}`
        : `lsof -ti:${portStr} || fuser ${portStr}/tcp 2>/dev/null || true`;

    const result = execSync(command, { encoding: 'utf-8' }).trim();

    if (!result) {
      logLine('ports', `Port ${portStr} is free`, 'ok');
      return;
    }

    if (process.platform === 'win32') {
      const lines = result.split('\n');
      const pids = new Set<string>();
      for (const line of lines) {
        const match = line.trim().match(/\s+(\d+)\s*$/);
        const pid = match?.[1];
        if (pid) pids.add(pid);
      }
      for (const pid of pids) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      logLine('ports', `Stopped process(es) on port ${portStr}`, 'ok');
      return;
    }

    const pids = result.split('\n').filter(Boolean);
    if (pids.length > 0) {
      execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
      logLine('ports', `Stopped PID(s) on port ${portStr}: ${pids.join(', ')}`, 'ok');
    }
  } catch {
    logLine('ports', `Port ${String(port)} is free`, 'ok');
  }
}

function killPorts(ports: number[]): void {
  logLine('ports', `Cleaning up ports: ${ports.join(', ')}`);
  for (const port of ports) killPort(port);
  logLine('ports', 'Port cleanup complete', 'ok');
  console.log('');
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function ensurePostgres(): Promise<void> {
  const rawPort = process.env['POSTGRES_PORT'] ?? '5432';
  const port = Number(rawPort);
  const targetPort = Number.isFinite(port) ? port : 5432;

  const isRunning = await isPortOpen(targetPort);

  if (isRunning) {
    logLine('db', `PostgreSQL is running on port ${String(targetPort)}`, 'ok');
    return;
  }

  // If the expected port is not the default, auto-starting a system service on 5432 won't help.
  if (targetPort !== 5432) {
    logLine('db', `PostgreSQL not running on port ${String(targetPort)}`, 'warn');
    return;
  }

  logLine('db', 'PostgreSQL not running. Attempting to start...');

  try {
    execSync('sudo service postgresql start', { stdio: 'inherit' });
    logLine('db', 'PostgreSQL started', 'ok');
  } catch {
    logLine('db', 'Could not start PostgreSQL automatically', 'warn');
    logLine('db', 'Start it manually: sudo service postgresql start', 'warn');
  }
}

function runEnvPreflight(filters: string[]): void {
  // Only validate server env when the server might run.
  // `pnpm dev web` should be able to start without a fully configured backend.
  if (filters.length > 0 && !filters.includes('server')) return;

  // Ensure we load `config/env/.env.development` by default.
  process.env['NODE_ENV'] ??= 'development';

  logLine('env', 'Validating environment files');
  loadServerEnv(); // Exits process on failure with a clear error message.
  logLine('env', 'Environment OK', 'ok');
}

function redactDbUrl(url: string): string {
  // Covers: postgresql://user:pass@host/db and postgres://user:pass@host/db
  return url.replace(/:(?:[^:@/]+)@/g, ':****@');
}

async function ensureDatabaseConnection(filters: string[]): Promise<void> {
  // Only check DB connectivity when the server might run.
  if (filters.length > 0 && !filters.includes('server')) return;

  const connectionString = buildConnectionString(process.env as Record<string, string | undefined>);
  const ok = await canReachDatabase(connectionString);
  if (ok) {
    logLine('db', 'Database connection OK', 'ok');
    return;
  }

  logLine('db', 'Database connection failed', 'error');
  process.stderr.write(`   ${redactDbUrl(connectionString)}\n`);
  process.stderr.write('\nFix options:\n');
  process.stderr.write(
    '1) Use Docker Postgres (recommended): stop local Postgres if it is using port 5432, then run `pnpm docker:dev`.\n',
  );
  process.stderr.write(
    '2) Use local Postgres: update `config/env/.env.development` to match your local user/password, or set the role password to match `POSTGRES_PASSWORD`.\n',
  );
  process.exit(1);
}

function startWatcher(script: string): ChildProcess {
  const watcher = spawn('pnpm', ['tsx', script, '--watch', '--quiet'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: false,
  });

  watcher.on('error', (err) => {
    logLine('watch', `${basename(script)} failed to start: ${String(err)}`, 'error');
  });

  return watcher;
}

function startTurboDev(filters: string[]): ChildProcess {
  const args = ['turbo', 'run', 'dev', '--log-order=stream', '--log-prefix=task'];
  for (const f of filters) {
    args.push(`--filter=@abe-stack/${f}`);
  }

  const turbo = spawn('pnpm', args, {
    cwd: ROOT,
    stdio: ['inherit', 'pipe', 'pipe'], // Capture stdout/stderr
    shell: false,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      TURBO_LOG: 'light',
    },
  });

  const processOutput = (data: Buffer | string, isError = false): void => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract scope and message
      // Format: @abe-stack/server:dev: Message content...
      const match = trimmed.match(/^@abe-stack\/([^:]+):dev:\s+(.*)$/);

      if (match) {
        // Known scope
        const scope = match[1]; // e.g., 'server', 'web'
        const message = match[2];
        logLine(scope, message, isError ? 'error' : 'info');
      } else if (
        trimmed.startsWith('•') ||
        trimmed.startsWith('Tasks:') ||
        trimmed.startsWith('Cached:')
      ) {
        // Turbo summary lines
        logLine('turbo', trimmed.replace(/@abe-stack\//g, ''), 'info');
      } else {
        // Unknown or raw line (common with stack traces)
        logLine('turbo', trimmed, isError ? 'error' : 'info');
      }
    }
  };

  turbo.stdout?.on('data', (data) => processOutput(data));
  turbo.stderr?.on('data', (data) => processOutput(data, true));

  turbo.on('error', (err) => {
    logLine('turbo', `Failed to start: ${String(err)}`, 'error');
    process.exit(1);
  });

  return turbo;
}

async function main(): Promise<void> {
  const filters = process.argv.slice(2);

  renderStartupBanner(filters);

  // Best-effort port cleanup (matches previous root `pnpm dev` behavior).
  // Keep this before the env preflight, so old servers don't mask env/db issues.
  const needsServer = filters.length === 0 || filters.includes('server');
  const needsWeb = filters.length === 0 || filters.includes('web');
  const portsToClean = [
    ...(needsWeb ? [5173] : []),
    ...(needsServer ? [8080, 3000] : []),
  ];
  if (portsToClean.length > 0) killPorts(portsToClean);

  logHeader('Development Environment', 'Preparing local services and watchers');
  if (filters.length > 0) {
    logLine('dev', `Filter: ${filters.map((f) => `@abe-stack/${f}`).join(', ')}`);
  }

  runEnvPreflight(filters);

  // Ensure PostgreSQL is running (skip when server is not included)
  if (needsServer) {
    await ensurePostgres();
    await ensureDatabaseConnection(filters);

    // Auto-migrate database schema (safe to run repeatedly)
    logLine('db', 'Verifying database schema...');
    try {
      execSync('pnpm db:push', { stdio: 'pipe' }); // Pipe checking to avoid spam, we'll assume success if no error
      logLine('db', 'Database schema up to date', 'ok');
    } catch (error) {
      logLine('db', 'Schema update failed (non-critical, continuing)', 'warn');
    }
  }

  // Start all sync watchers silently in background
  // Note: sync-docs removed — docs are now discovered via import.meta.glob at build time
  const watchers = [
    startWatcher('src/tools/sync/sync-file-headers.ts'),
    startWatcher('src/tools/sync/sync-css-theme.ts'),
  ];

  logLine('watch', 'Sync watchers running (headers, theme)', 'ok');

  // Give watchers a moment to do initial sync
  setTimeout(() => {
    logLine('turbo', 'Starting Turbo dev tasks');
    const turbo = startTurboDev(filters);

    const cleanup = (): void => {
      console.log('');
      logLine('dev', 'Shutting down...');
      for (const w of watchers) w.kill();
      turbo.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    turbo.on('exit', (code) => {
      for (const w of watchers) w.kill();
      process.exit(code ?? 0);
    });
  }, 500);
}

main().catch((error) => {
  logLine('dev', `Startup failed: ${String(error)}`, 'error');
  process.exit(1);
});
