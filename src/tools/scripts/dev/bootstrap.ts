// src/tools/scripts/dev/bootstrap.ts
/**
 * Database Bootstrap Script
 *
 * Seeds the database with initial bootstrap data for development.
 * Creates admin user and any other required initial data.
 *
 * Usage:
 *   pnpm bootstrap
 *   pnpm tsx src/tools/scripts/dev/bootstrap.ts
 */

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helper to parse .env file
function parseEnv(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const key = match[1]?.trim();
        const value = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1') ?? '';
        if (key) env[key] = value;
      }
    }
    return env;
  } catch {
    console.warn(`Warning: Could not read env file at ${path}`);
    return {};
  }
}

// Helper to run command
function run(command: string, args: string[], env?: NodeJS.ProcessEnv, cwd?: string): boolean {
  console.log(`> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env },
  });

  return result.status === 0;
}

export function bootstrap(): void {
  console.log('🚀 Starting Database Bootstrap...\n');

  // Load environment variables
  const envPath = resolve(process.cwd(), '.config/env/.env.development');
  const envVars = parseEnv(envPath);
  console.log('✅ Loaded environment variables\n');

  // Run seed script from root (scripts are now in tools/scripts/db/)
  console.log('🌱 Seeding database with initial data...');
  const success = run('pnpm', ['db:seed'], envVars);

  if (!success) {
    console.error('❌ Bootstrap failed!');
    process.exit(1);
  }

  console.log('\n🎉 Bootstrap complete!');
}

// Run if called directly
const isMainModule = process.argv[1]?.includes('bootstrap.ts') ?? false;
if (isMainModule) {
  try {
    bootstrap();
  } catch (error: unknown) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}
