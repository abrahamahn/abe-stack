#!/usr/bin/env node
// tools/scripts/dev/dev.ts
/**
 * Development server startup script.
 *
 * Runs all sync watchers silently in background, then starts turbo dev.
 *
 * Usage:
 *   pnpm dev              # Start all
 *   pnpm dev web          # Start web only
 *   pnpm dev server       # Start server only
 */

import { execSync, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';

import type { ChildProcess } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const USE_COLOR = process.stdout.isTTY;

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
} as const;

function colorize(text: string, color: keyof typeof COLORS): string {
  if (!USE_COLOR) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function logLine(label: string, message: string): void {
  const paddedLabel = label.padEnd(10, ' ');
  console.log(`${colorize(paddedLabel, 'cyan')}${message}`);
}

function logHeader(title: string): void {
  const line = '='.repeat(Math.max(title.length + 8, 32));
  console.log(colorize(line, 'dim'));
  console.log(colorize(`=== ${title} ===`, 'green'));
  console.log(colorize(line, 'dim'));
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
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
  const isRunning = await isPortOpen(5432);

  if (isRunning) {
    logLine('[db]', 'PostgreSQL running on port 5432');
    return;
  }

  logLine('[db]', 'PostgreSQL not running. Attempting to start...');

  try {
    execSync('sudo service postgresql start', { stdio: 'inherit' });
    logLine('[db]', colorize('PostgreSQL started', 'green'));
  } catch {
    console.error(colorize('[db]', 'yellow'), 'Could not start PostgreSQL automatically.');
    console.error(colorize('[db]', 'yellow'), 'Start it manually: sudo service postgresql start');
  }
}

function startWatcher(script: string): ChildProcess {
  const watcher = spawn('pnpm', ['tsx', script, '--watch', '--quiet'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: false,
  });

  watcher.on('error', (err) => {
    console.error(`[${path.basename(script)}] Failed to start:`, err);
  });

  return watcher;
}

function startTurboDev(filter?: string): ChildProcess {
  const args = ['turbo', 'run', 'dev', '--log-order=stream', '--log-prefix=task'];
  if (filter) {
    args.push(`--filter=@abe-stack/${filter}`);
  }

  const turbo = spawn('pnpm', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      TURBO_LOG: 'light',
    },
  });

  turbo.on('error', (err) => {
    console.error('[turbo] Failed to start:', err);
    process.exit(1);
  });

  return turbo;
}

function runBuilds(): void {
  logLine('[build]', 'Building core/db packages');
  execSync('pnpm --filter @abe-stack/shared build', { stdio: 'inherit', cwd: ROOT });
  execSync('pnpm --filter @abe-stack/db build', { stdio: 'inherit', cwd: ROOT });
}

async function main(): Promise<void> {
  const filter = process.argv[2];

  logHeader('Dev Environment');
  logLine('[dev]', 'Starting development environment');
  if (filter) {
    logLine('[dev]', `Filter: @abe-stack/${filter}`);
  }

  // Ensure PostgreSQL is running (skip for web-only or desktop-only)
  if (!filter || filter === 'server') {
    await ensurePostgres();
  }

  // Ensure shared packages are built for runtime resolution
  runBuilds();

  // Start all sync watchers silently in background
  const watchers = [
    startWatcher('tools/sync/sync-file-headers.ts'),
    startWatcher('tools/sync/sync-css-theme.ts'),
  ];

  logLine('[dev]', 'Watchers running (config, headers, theme)');

  // Give watchers a moment to do initial sync
  setTimeout(() => {
    logLine('[dev]', 'Starting turbo dev tasks');
    const turbo = startTurboDev(filter);

    const cleanup = (): void => {
      console.log('\nShutting down...');
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

main().catch(console.error);
