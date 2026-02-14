// main/server/engine/src/config/env.loader.ts
import fs from 'node:fs';
import path from 'node:path';

import { EnvSchema } from '@abe-stack/shared/config';

import type { FullEnv } from '@abe-stack/shared/config';

/**
 * 1. Low-Level Disk Reader
 * Zero-dependency, monorepo-aware, priority-ordered.
 */

function parseAndPopulate(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;

      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();

      const isQuoted =
        (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
      if (!isQuoted) {
        // Support inline comments like: FLAG=false  # options: true | false
        val = val.replace(/\s+#.*$/, '').trim();
      }

      // Clean quotes
      if (isQuoted) val = val.slice(1, -1);

      // Priority: System Env > Custom File > Local > Stage
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    process.stderr.write(`[EnvLoader] Failed to read ${filePath}: ${String(err)}\n`);
  }
}

/**
 * Initializes the environment by loading .env files with correct priority.
 */
export function initEnv(): void {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  let currentDir = process.cwd();
  let configDir: string | null = null;

  // Locate config/env
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(currentDir, 'config');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      configDir = candidate;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (configDir === null) {
    if (process.env['NODE_ENV'] !== 'test') {
      process.stdout.write(
        '[EnvLoader] Warning: config directory not found. Environment files skipped.\n',
      );
    }
    return;
  }

  const repoRoot = path.dirname(configDir);
  if (process.env['NODE_ENV'] !== 'test') {
    process.stdout.write(`[EnvLoader] Resolved Repo Root: ${repoRoot}\n`);
  }

  // Priority 1: Explicit ENV_FILE
  const customPath = process.env['ENV_FILE'];
  if (customPath !== undefined && customPath !== '') {
    const resolvedPath = path.resolve(process.cwd(), customPath);
    if (process.env['NODE_ENV'] !== 'test') {
      process.stdout.write(`[EnvLoader] Loading explicit file: ${customPath}\n`);
    }
    parseAndPopulate(resolvedPath);
  }

  // Priority 1: .env.local (Config directory - Not committed)
  parseAndPopulate(path.join(configDir, 'env', '.env.local'));

  // Priority 2: Stage-specific (.env.production, .env.development)
  const envFile = path.join(configDir, 'env', `.env.${nodeEnv}`);
  if (process.env['NODE_ENV'] !== 'test') {
    process.stdout.write(`[EnvLoader] Loading stage: ${nodeEnv}\n`);
  }
  parseAndPopulate(envFile);

  // Priority 3: Base .env (Config directory)
  parseAndPopulate(path.join(configDir, 'env', '.env'));

  // Priority 4: Root fallbacks (for flexibility in deployment)
  parseAndPopulate(path.join(repoRoot, '.env.local'));
  parseAndPopulate(path.join(repoRoot, `.env.${nodeEnv}`));
  parseAndPopulate(path.join(repoRoot, '.env'));
}

/**
 * 2. High-Level Validator
 * The "Gatekeeper" for the server.
 *
 * @returns Validated environment object
 * @throws Exits process on validation failure
 */
export function loadServerEnv(): FullEnv {
  // 1. Load the files into process.env
  initEnv();

  // 2. Validate using the schema contract
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') sanitized[k] = v.replace(/\s+#.*$/, '').trim();
    else sanitized[k] = v;
  }

  const result = EnvSchema.safeParse(sanitized) as
    | { success: true; data: FullEnv }
    | { success: false; error: { message: string } };

  if (!result.success) {
    process.stderr.write('\n❌ ABE-STACK: Environment Validation Failed\n');
    process.stderr.write(`   ↳ ${result.error.message}\n`);
    process.exit(1);
  }

  const env = result.data;

  // 3. Production Sanity Checks
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.length < 32) {
      process.stderr.write('❌ SECURITY RISK: JWT_SECRET must be 32+ chars in production.\n');
      process.exit(1);
    }
  }

  return env;
}

/**
 * Validates the environment object.
 *
 * @param raw - Raw environment record to validate
 * @returns Validated environment object
 * @throws Exits process on validation failure
 */
export function validateEnvironment(raw: Record<string, unknown> = process.env): FullEnv {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') sanitized[k] = v.replace(/\s+#.*$/, '').trim();
    else sanitized[k] = v;
  }

  const parsed = EnvSchema.safeParse(sanitized) as
    | { success: true; data: FullEnv }
    | { success: false; error: { message: string } };
  if (!parsed.success) {
    process.stderr.write(`Environment Validation Failed: ${parsed.error.message}\n`);
    process.exit(1);
  }
  return parsed.data;
}
