// tools/dev/bootstrap.ts
/**
 * Database Bootstrap Script
 *
 * Seeds the database with initial bootstrap data for development.
 * Creates admin user and any other required initial data.
 *
 * Usage:
 *   pnpm bootstrap
 *   ./node_modules/.bin/tsx tools/dev/bootstrap.ts
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Helper to parse .env file
function parseEnv(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        env[match[1].trim()] = value;
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
  const envPath = resolve(process.cwd(), 'config/.env/.env.development');
  const envVars = parseEnv(envPath);
  console.log('✅ Loaded environment variables\n');

  // Run seed script from server directory (so path aliases work)
  console.log('🌱 Seeding database with initial data...');
  const serverDir = resolve(process.cwd(), 'apps/server');
  const success = run('pnpm', ['db:seed'], envVars, serverDir);

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
