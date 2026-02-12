// src/tools/scripts/audit/api-client-sync.ts
/**
 * API Client Sync Validator
 *
 * Compares the route manifest (server-side) against the hand-written ApiClient methods
 * to identify routes that lack client coverage.
 *
 * Usage: pnpm audit:api-sync
 *
 * @module tools/audit/api-client-sync
 */

import fs from 'node:fs';
import path from 'node:path';

import type { RouteManifestEntry } from './route-manifest';

// ============================================================================
// Constants
// ============================================================================

const API_CLIENT_PATH = path.resolve('src/client/api/src/api/client.ts');

/**
 * Routes that are intentionally not covered by the client
 * (webhooks, internal, system routes, etc.)
 */
const EXCLUDED_MODULES = new Set(['system', 'webhooks']);
const EXCLUDED_PATTERNS = [/\/health$/, /\/readiness$/, /\/docs/, /\/webhook/];

// ============================================================================
// Client Method Extraction
// ============================================================================

/**
 * Extract API paths referenced in the ApiClient source code.
 * Looks for string literals matching API URL patterns.
 *
 * @param clientPath - Path to the ApiClient source file
 * @returns Set of API paths found in the client code
 */
export function extractClientPaths(clientPath: string = API_CLIENT_PATH): Set<string> {
  if (!fs.existsSync(clientPath)) {
    console.warn(`⚠️  ApiClient not found at ${clientPath}`);
    return new Set();
  }

  const content = fs.readFileSync(clientPath, 'utf-8');
  const paths = new Set<string>();

  // Match URL patterns like '/api/v1/auth/login', `/auth/login`, 'auth/login'
  const urlPattern =
    /['"`](?:\/api(?:\/v\d+)?)?\/([a-z][a-z0-9/-]*(?:\$\{[^}]+\}[a-z0-9/-]*)*)['"`]/g;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(content)) !== null) {
    const routePath = match[1];
    if (routePath !== undefined) {
      paths.add(routePath);
    }
  }

  return paths;
}

/**
 * Check if a route path is covered by any client path (fuzzy matching).
 * Handles parameterized routes like /users/:id matching /users/${userId}.
 */
function isRouteCovered(routePath: string, clientPaths: Set<string>): boolean {
  // Normalize: strip /api/v1/ prefix and leading slash
  const normalized = routePath
    .replace(/^\/api\/v\d+\//, '')
    .replace(/^\/api\//, '')
    .replace(/^\//, '');

  // Direct match
  if (clientPaths.has(normalized)) return true;

  // Strip params for partial matching: /users/:id → users
  const withoutParams = normalized.replace(/\/:[^/]+/g, '');
  for (const cp of clientPaths) {
    if (cp.includes(withoutParams)) return true;
  }

  return false;
}

// ============================================================================
// Sync Check
// ============================================================================

export interface SyncResult {
  totalRoutes: number;
  coveredRoutes: number;
  uncoveredRoutes: RouteManifestEntry[];
  excludedRoutes: number;
}

/**
 * Compare route manifest against ApiClient coverage.
 *
 * @param manifest - Array of route manifest entries
 * @param clientPath - Path to ApiClient source (for testing)
 * @returns Sync check results
 */
export function checkSync(manifest: RouteManifestEntry[], clientPath?: string): SyncResult {
  const clientPaths = extractClientPaths(clientPath);
  const uncovered: RouteManifestEntry[] = [];
  let excluded = 0;

  for (const route of manifest) {
    // Skip excluded modules and patterns
    if (EXCLUDED_MODULES.has(route.module)) {
      excluded++;
      continue;
    }
    if (EXCLUDED_PATTERNS.some((p) => p.test(route.path))) {
      excluded++;
      continue;
    }

    if (!isRouteCovered(route.path, clientPaths)) {
      uncovered.push(route);
    }
  }

  return {
    totalRoutes: manifest.length,
    coveredRoutes: manifest.length - excluded - uncovered.length,
    uncoveredRoutes: uncovered,
    excludedRoutes: excluded,
  };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('api-client-sync') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  // Try to load a saved manifest, or inform user
  const manifestPath = path.resolve('route-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.log('⚠️  No route-manifest.json found.');
    console.log('   Run `pnpm route:manifest > route-manifest.json` first.');
    process.exit(1);
  }

  const manifest: RouteManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const result = checkSync(manifest);

  console.log('\n📊 API Client Sync Report\n');
  console.log(`  Total routes:    ${String(result.totalRoutes)}`);
  console.log(`  Excluded:        ${String(result.excludedRoutes)}`);
  console.log(`  Covered:         ${String(result.coveredRoutes)}`);
  console.log(`  Uncovered:       ${String(result.uncoveredRoutes.length)}`);

  if (result.uncoveredRoutes.length > 0) {
    console.log('\n⚠️  Routes without client coverage:\n');
    for (const r of result.uncoveredRoutes) {
      console.log(`  ${r.method.padEnd(6)} ${r.path} (${r.module})`);
    }
  } else {
    console.log('\n✅ All routes have client coverage!');
  }
}
