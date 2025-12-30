import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Helper to run command
function run(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): void {
  // Filter sensitive env vars from logs if needed, but for dev tool it's usually fine.
  console.log(`> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env },
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`❌ Command failed with status ${result.status}`);
    process.exit(1);
  }
}

// Helper to parse .env file
function parseEnv(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        // Remove quotes if present
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

console.log('🚀 Starting ABE Stack Setup...');

// 1. Load Environment Variables
const envPath = resolve(process.cwd(), 'config/.env.development');
const envVars = parseEnv(envPath);
console.log('✅ Loaded environment variables from config/.env.development');

// 2. Start Docker Containers
console.log('\n🐳 Starting Docker containers...');
run('docker', ['compose', 'up', '-d'], undefined, envVars);

// 3. Wait for Database
console.log('\n⏳ Waiting for Database to be ready...');
let retries = 30;
let healthy = false;

while (retries > 0) {
  try {
    const result = spawnSync('docker', [
      'inspect',
      '--format',
      '{{.State.Health.Status}}',
      'abe-stack-postgres',
    ]);
    const status = result.stdout.toString().trim();
    if (status === 'healthy') {
      console.log('✅ Database is ready!');
      healthy = true;
      break;
    }
  } catch (_e: unknown) {
    // ignore and retry
  }

  process.stdout.write('.');
  spawnSync('sleep', ['1']);
  retries--;
}

if (!healthy) {
  console.error(
    '\n❌ Database failed to become healthy in time. Check "docker compose logs postgres".',
  );
  process.exit(1);
}

// 4. Build DB Package (Required because server uses it from dist/ in this setup)
console.log('\n📦 Building DB Package...');
run('pnpm', ['build', '--filter', '@abe-stack/db'], undefined, envVars);

// 5. Push Schema (Migrations)
console.log('\n🔄 Syncing Database Schema...');
run('pnpm', ['--filter', '@abe-stack/db', 'db:push'], undefined, envVars);

// 6. Seed Database
console.log('\n🌱 Seeding Database...');
run('tsx', ['apps/server/src/scripts/seed.ts'], undefined, envVars);

console.log('\n🎉 Setup Complete! You are ready to code.');
console.log('Run "pnpm dev" to start the development servers.');
