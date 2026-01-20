#!/usr/bin/env node
// tools/dev/start-dev.ts
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
    console.log('✓ PostgreSQL is running on port 5432\n');
    return;
  }

  console.log('PostgreSQL not running. Attempting to start...');

  try {
    execSync('sudo service postgresql start', { stdio: 'inherit' });
    console.log('✓ PostgreSQL started\n');
  } catch {
    console.error('\n⚠ Could not start PostgreSQL automatically.');
    console.error('  Please start it manually: sudo service postgresql start\n');
  }
}

function startWatcher(script: string): ChildProcess {
  const watcher = spawn('pnpm', ['tsx', script, '--watch', '--quiet'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
  });

  watcher.on('error', (err) => {
    console.error(`[${path.basename(script)}] Failed to start:`, err);
  });

  return watcher;
}

function startConfigGenerator(): ChildProcess {
  const watcher = spawn('pnpm', ['tsx', 'config/generators/index.ts', '--watch', '--quiet'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
  });

  watcher.on('error', (err) => {
    console.error('[config:generate] Failed to start:', err);
  });

  return watcher;
}

function startTurboDev(filter?: string): ChildProcess {
  const args = ['turbo', 'run', 'dev'];
  if (filter) {
    args.push(`--filter=@abe-stack/${filter}`);
  }

  const turbo = spawn('pnpm', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  turbo.on('error', (err) => {
    console.error('[turbo] Failed to start:', err);
    process.exit(1);
  });

  return turbo;
}

async function main(): Promise<void> {
  const filter = process.argv[2];

  console.log('Starting development environment...\n');

  // Ensure PostgreSQL is running (skip for web-only or desktop-only)
  if (!filter || filter === 'server') {
    await ensurePostgres();
  }

  // Start all sync watchers silently in background
  const watchers = [
    startConfigGenerator(), // Generates tsconfigs and aliases
    startWatcher('config/lint/sync-file-headers.ts'),
    startWatcher('config/lint/sync-test-folders.ts'),
    startWatcher('config/lint/sync-css-theme.ts'),
  ];

  // Give watchers a moment to do initial sync
  setTimeout(() => {
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
