// main/tools/scripts/audit/bundle-size.ts
/**
 * Bundle Size Audit
 *
 * Measures actual production bundle sizes (gzipped) from the web app build output.
 * Reports against a 250KB gzipped target per JS chunk.
 * Unlike bundle-monitor.ts which estimates sizes, this measures real output.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// ============================================================================
// Constants
// ============================================================================

const MAX_GZIP_KB = 250;
const ROOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '..');
const DIST_ASSETS = join(ROOT_DIR, 'src', 'apps', 'web', 'dist', 'assets');

// ============================================================================
// Types
// ============================================================================

interface AssetEntry {
  name: string;
  rawBytes: number;
  gzipBytes: number;
}

// ============================================================================
// Analysis
// ============================================================================

function collectAssets(dir: string, extensions: string[]): AssetEntry[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => extensions.some((ext) => f.endsWith(ext)))
    .map((name) => {
      const filePath = join(dir, name);
      const content = readFileSync(filePath);
      const rawBytes = statSync(filePath).size;
      const gzipBytes = gzipSync(content).length;
      return { name, rawBytes, gzipBytes };
    })
    .sort((a, b) => b.gzipBytes - a.gzipBytes);
}

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

// ============================================================================
// Report
// ============================================================================

function printReport(assets: AssetEntry[]): boolean {
  console.log('Bundle Size Audit\n');
  console.log('File'.padEnd(50) + 'Raw'.padStart(10) + 'Gzipped'.padStart(10));
  console.log('-'.repeat(70));

  let hasViolation = false;

  for (const asset of assets) {
    const rawKB = formatKB(asset.rawBytes);
    const gzipKB = formatKB(asset.gzipBytes);
    const gzipKBNum = asset.gzipBytes / 1024;
    const flag = asset.name.endsWith('.js') && gzipKBNum > MAX_GZIP_KB ? ' [OVER LIMIT]' : '';

    if (flag !== '') hasViolation = true;

    console.log(
      asset.name.padEnd(50) + `${rawKB}KB`.padStart(10) + `${gzipKB}KB`.padStart(10) + flag,
    );
  }

  const totalRaw = assets.reduce((sum, a) => sum + a.rawBytes, 0);
  const totalGzip = assets.reduce((sum, a) => sum + a.gzipBytes, 0);

  console.log('-'.repeat(70));
  console.log(
    'TOTAL'.padEnd(50) +
      `${formatKB(totalRaw)}KB`.padStart(10) +
      `${formatKB(totalGzip)}KB`.padStart(10),
  );
  console.log(`\nThreshold: ${String(MAX_GZIP_KB)}KB gzipped per JS chunk`);

  return hasViolation;
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  if (!existsSync(DIST_ASSETS)) {
    console.error('Build output not found at:', DIST_ASSETS);
    console.error('Run: pnpm --filter @bslt/web build');
    process.exit(1);
  }

  const jsAssets = collectAssets(DIST_ASSETS, ['.js']);
  const cssAssets = collectAssets(DIST_ASSETS, ['.css']);
  const allAssets = [...jsAssets, ...cssAssets];

  if (allAssets.length === 0) {
    console.error('No JS or CSS assets found in:', DIST_ASSETS);
    process.exit(1);
  }

  const hasViolation = printReport(allAssets);

  if (hasViolation) {
    console.error('\nFAIL: One or more JS chunks exceed the gzipped size limit.');
    process.exit(1);
  }

  console.log('\nPASS: All JS chunks within size limit.');
}

main();
