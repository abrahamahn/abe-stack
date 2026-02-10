import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CacheState = {
  fingerprint: string;
  lastPrunedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const stateFile = path.join(repoRoot, '.cache', 'hooks-cache-state.json');
const oneDayMs = 24 * 60 * 60 * 1000;

const fingerprintInputs = [
  'package.json',
  'pnpm-lock.yaml',
  'turbo.json',
  'eslint.config.ts',
  'tsconfig.json',
  'config/.prettierrc',
  'config/.prettierignore',
];

const cachePaths = [
  path.join(repoRoot, 'node_modules', '.cache', 'eslint'),
  path.join(repoRoot, 'node_modules', '.cache', 'prettier'),
  path.join(repoRoot, 'node_modules', '.cache', 'typescript'),
];

function readFileSafe(relativePath: string): string {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function computeFingerprint(): string {
  const hash = crypto.createHash('sha256');
  for (const input of fingerprintInputs) {
    hash.update(`\n# ${input}\n`);
    hash.update(readFileSafe(input));
  }
  return hash.digest('hex');
}

function readState(): CacheState | null {
  if (!fs.existsSync(stateFile)) return null;
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw) as CacheState;
  } catch {
    return null;
  }
}

function writeState(state: CacheState): void {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function pruneCaches(): void {
  for (const target of cachePaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function shouldPrune(currentFingerprint: string, prev: CacheState | null): boolean {
  if (!prev) return true;
  if (prev.fingerprint !== currentFingerprint) return true;
  const elapsed = Date.now() - Date.parse(prev.lastPrunedAt);
  return Number.isNaN(elapsed) || elapsed >= oneDayMs;
}

function main(): void {
  const fingerprint = computeFingerprint();
  const prev = readState();

  if (shouldPrune(fingerprint, prev)) {
    pruneCaches();
    writeState({ fingerprint, lastPrunedAt: new Date().toISOString() });
    console.log('🧹 Local caches refreshed');
    return;
  }

  console.log('⚡ Local caches kept');
}

main();
