// src/tools/sync/sync-docs.ts
/**
 * Previously auto-generated docs metadata from the docs/ folder structure.
 *
 * Now a no-op: docs are discovered at build time via Vite's import.meta.glob
 * in src/apps/web/src/features/home/data/docsMeta.ts.
 *
 * This file is kept so that existing scripts (pnpm sync:docs) don't break.
 */

const isQuiet = process.argv.includes('--quiet');
if (!isQuiet) {
  console.log('sync-docs: skipped (docs discovered via import.meta.glob at build time)');
}
