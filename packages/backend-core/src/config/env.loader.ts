// packages/core/src/config/env.loader.ts
import fs from 'node:fs';
import path from 'node:path';

import { EnvSchema, type FullEnv } from './env.schema';

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

      // Clean quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      // Priority: System Env > Custom File > Local > Stage
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.error(`[EnvLoader] Failed to read ${filePath}:`, err);
  }
}

/**
 * Initializes the environment by loading .env files with correct priority.
 */
export function initEnv(): void {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  let currentDir = process.cwd();
  let configDir: string | null = null;

  // Locate .config/env
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(currentDir, '.config');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      configDir = candidate;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (configDir === null) {
    if (process.env['NODE_ENV'] !== 'test') {
      console.warn('[EnvLoader] Warning: .config directory not found. Environment files skipped.');
    }
    return;
  }

  const repoRoot = path.dirname(configDir);
  if (process.env['NODE_ENV'] !== 'test') {
    console.log(`[EnvLoader] Resolved Repo Root: ${repoRoot}`);
  }

  // Priority 1: Explicit ENV_FILE
  const customPath = process.env['ENV_FILE'];
  if (customPath !== undefined && customPath !== '') {
    const resolvedPath = path.resolve(process.cwd(), customPath);
    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[EnvLoader] Loading explicit file: ${customPath}`);
    }
    parseAndPopulate(resolvedPath);
  }

  // Priority 1: .env.local (Config directory - Not committed)
  parseAndPopulate(path.join(configDir, 'env', '.env.local'));

  // Priority 2: Stage-specific (.env.production, .env.development)
  const envFile = path.join(configDir, 'env', `.env.${nodeEnv}`);
  if (process.env['NODE_ENV'] !== 'test') {
    console.log(`[EnvLoader] Loading stage: ${nodeEnv}`);
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
 */

export function loadServerEnv(): FullEnv {
  // 1. Load the files into process.env
  initEnv();

  // 2. Validate using the existing Zod Contract
  const result = EnvSchema.safeParse(process.env) as
    | { success: true; data: FullEnv }
    | { success: false; error: { message: string } };

  if (!result.success) {
    console.error('\n❌ ABE-STACK: Environment Validation Failed');
    console.error(`   ↳ ${result.error.message}`);
    process.exit(1);
  }

  const env = result.data;

  // 3. Production Sanity Checks
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.length < 32) {
      console.error('❌ SECURITY RISK: JWT_SECRET must be 32+ chars in production.');
      process.exit(1);
    }
  }

  return env;
}

/**
 * Validates the environment object.
 */
export function validateEnvironment(raw: Record<string, unknown> = process.env): FullEnv {
  const parsed = EnvSchema.safeParse(raw) as
    | { success: true; data: FullEnv }
    | { success: false; error: { message: string } };
  if (!parsed.success) {
    console.error('Environment Validation Failed:', parsed.error.message);
    process.exit(1);
  }
  return parsed.data;
}

export { EnvSchema, EnvSchema as serverEnvSchema };
export type { FullEnv as ServerEnv };
