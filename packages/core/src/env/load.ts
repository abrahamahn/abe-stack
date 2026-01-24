// packages/core/src/env/load.ts
import fs from 'node:fs';
import path from 'node:path';

/**
 * Abe-Stack Environment Loader
 * Zero-dependency, monorepo-aware, priority-ordered.
 */

function parseAndPopulate(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

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

export function initEnv(): void {
  const nodeEnv = process.env['NODE_ENV'] || 'development';
  let currentDir = process.cwd();
  let configDir: string | null = null;

  // 1. Locate .config/env
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(currentDir, '.config');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      configDir = candidate;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (!configDir) {
    if (process.env['NODE_ENV'] !== 'test') {
      console.warn('[EnvLoader] Warning: .config directory not found. Environment files skipped.');
    }
    return;
  }

  const repoRoot = path.dirname(configDir);
  if (process.env['NODE_ENV'] !== 'test') {
    console.log(`[EnvLoader] Resolved Repo Root: ${repoRoot}`);
  }

  // 2. Priority 1: Explicit ENV_FILE
  const customPath = process.env['ENV_FILE'];
  if (customPath) {
    const resolvedPath = path.resolve(process.cwd(), customPath);
    if (process.env['NODE_ENV'] !== 'test') {
      console.log(`[EnvLoader] Loading explicit file: ${customPath}`);
    }
    parseAndPopulate(resolvedPath);
  }

  // 3. Priority 1: .env.local (Config directory - Not committed)
  parseAndPopulate(path.join(configDir, 'env', '.env.local'));

  // 4. Priority 2: Stage-specific (.env.production, .env.development)
  const envFile = path.join(configDir, 'env', `.env.${nodeEnv}`);
  if (process.env['NODE_ENV'] !== 'test') {
    console.log(`[EnvLoader] Loading stage: ${nodeEnv}`);
  }
  parseAndPopulate(envFile);

  // 5. Priority 3: Base .env (Config directory)
  parseAndPopulate(path.join(configDir, 'env', '.env'));

  // 6. Priority 4: Root fallbacks
  parseAndPopulate(path.join(repoRoot, '.env.local'));
  parseAndPopulate(path.join(repoRoot, '.env'));
}
