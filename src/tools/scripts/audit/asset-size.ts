// src/tools/scripts/audit/asset-size.ts
/**
 * Asset Size Audit
 *
 * Walks the web app's public directory and reports sizes for images.
 * Flags any image over 100KB and reports total asset weight.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGE_KB = 100;
const ROOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src', 'apps', 'web', 'public');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.gif']);

// ============================================================================
// Types
// ============================================================================

interface AssetInfo {
  path: string;
  sizeBytes: number;
  oversized: boolean;
}

// ============================================================================
// Analysis
// ============================================================================

function walkDir(dir: string, results: AssetInfo[] = []): AssetInfo[] {
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else {
      const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        const sizeBytes = statSync(fullPath).size;
        results.push({
          path: fullPath.replace(PUBLIC_DIR + '/', ''),
          sizeBytes,
          oversized: sizeBytes / 1024 > MAX_IMAGE_KB,
        });
      }
    }
  }

  return results;
}

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

// ============================================================================
// Report
// ============================================================================

function printReport(assets: AssetInfo[]): boolean {
  console.log('Asset Size Audit\n');
  console.log('File'.padEnd(50) + 'Size'.padStart(10));
  console.log('-'.repeat(60));

  const sorted = [...assets].sort((a, b) => b.sizeBytes - a.sizeBytes);
  let hasOversized = false;

  for (const asset of sorted) {
    const sizeKB = formatKB(asset.sizeBytes);
    const flag = asset.oversized ? ' [OVERSIZED]' : '';
    if (asset.oversized) hasOversized = true;
    console.log(asset.path.padEnd(50) + `${sizeKB}KB`.padStart(10) + flag);
  }

  const totalBytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0);

  console.log('-'.repeat(60));
  console.log('TOTAL'.padEnd(50) + `${formatKB(totalBytes)}KB`.padStart(10));
  console.log(`\nImages found: ${String(assets.length)}`);
  console.log(`Threshold: ${String(MAX_IMAGE_KB)}KB per image`);

  return hasOversized;
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  if (!existsSync(PUBLIC_DIR)) {
    console.error('Public directory not found at:', PUBLIC_DIR);
    process.exit(1);
  }

  const assets = walkDir(PUBLIC_DIR);

  if (assets.length === 0) {
    console.log('No image assets found in:', PUBLIC_DIR);
    return;
  }

  const hasOversized = printReport(assets);

  if (hasOversized) {
    console.warn('\nWARN: Some images exceed the size threshold. Consider optimizing them.');
  } else {
    console.log('\nPASS: All images within size limit.');
  }
}

main();
