// main/tools/scripts/audit/api-client-sync.ts
/**
 * API Client Sync Validator
 *
 * Compares server route manifest entries against client-side API calls across:
 * - main/client/api (shared API client package)
 * - main/apps/web (feature-level API clients/hooks)
 *
 * Detects:
 * - missing client coverage
 * - HTTP method mismatches
 *
 * Usage:
 *   pnpm audit:api-sync
 *   pnpm audit:api-sync --fail-on-drift
 *
 * If `route-manifest.json` exists, it is used. Otherwise routes are registered
 * from source and analyzed in-memory.
 */

import fs from 'node:fs';
import path from 'node:path';

import { generateManifest, populateRegistryFromRouteMaps } from './route-manifest';

import type { RouteManifestEntry } from './route-manifest';

type ClientCall = {
  method: string;
  path: string;
  file: string;
};

type SyncMismatch = {
  route: RouteManifestEntry;
  calls: ClientCall[];
};

type UncoveredRoute = {
  route: RouteManifestEntry;
};

const CLIENT_ROOTS = [
  path.resolve('main/client/api/src'),
  path.resolve('main/apps/web/src'),
] as const;

const EXCLUDED_MODULES = new Set(['system', 'webhooks']);
const EXCLUDED_PATTERNS = [
  /\/health$/,
  /\/readiness$/,
  /\/docs/,
  /\/webhook/,
  /\/api\/auth\/oauth\/(google|github|apple)(?:\/callback|\/link|\/unlink)?$/,
];

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

function normalizeClientPath(rawPath: string): string {
  let pathValue = rawPath.trim();
  const queryIndex = pathValue.indexOf('?');
  if (queryIndex >= 0) {
    pathValue = pathValue.slice(0, queryIndex);
  }

  // Template/variable URLs that still include /api/.
  const apiIndexInPath = pathValue.indexOf('/api/');
  if (apiIndexInPath >= 0) {
    pathValue = pathValue.slice(apiIndexInPath);
  }

  // Absolute URL support.
  if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
    const apiIndex = pathValue.indexOf('/api/');
    if (apiIndex >= 0) {
      pathValue = pathValue.slice(apiIndex);
    }
  }

  if (!pathValue.startsWith('/')) {
    pathValue = `/${pathValue}`;
  }
  if (!pathValue.startsWith('/api/')) {
    pathValue = `/api${pathValue}`;
  }

  // Normalize template interpolation segments:
  // - path params: `/users/${id}` -> `/users/:param`
  // - query suffix vars: `/flags${query}` -> `/flags`
  pathValue = pathValue.replace(/\/\$\{[^}]+\}/g, '/:param').replace(/\$\{[^}]+\}/g, '');

  return pathValue.replace(/\/+/g, '/');
}

function normalizeRoutePath(routePath: string): string {
  const p = routePath.startsWith('/api/') ? routePath : `/api${routePath}`;
  return p.replace(/\/+/g, '/');
}

function extractClientCallsFromFile(file: string): ClientCall[] {
  const content = fs.readFileSync(file, 'utf8');
  const calls: ClientCall[] = [];
  const collectCalls = (pattern: RegExp, defaultMethod = 'GET'): void => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const rawPath = match[1];
      if (rawPath === undefined) continue;
      const options = match[2] ?? '';
      const methodMatch = options.match(/method\s*:\s*['"]([A-Z]+)['"]/);
      const method = methodMatch?.[1] ?? defaultMethod;
      calls.push({
        method,
        path: normalizeClientPath(rawPath),
        file,
      });
    }
  };

  // apiRequest(factory, '/path', { method: 'POST' })
  const apiRequestPattern =
    /apiRequest(?:<[\s\S]*?>)?\(\s*[^,]+,\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([\s\S]*?)\})?/g;
  collectCalls(apiRequestPattern);

  // request<T>('/path', { method: 'POST' })
  const requestPattern =
    /request(?:<[\s\S]*?>)?\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([\s\S]*?)\})?/g;
  collectCalls(requestPattern);

  // requestBlob('/path', { method: 'GET' })
  const requestBlobPattern =
    /requestBlob(?:<[\s\S]*?>)?\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([\s\S]*?)\})?/g;
  collectCalls(requestBlobPattern);

  // requestMultipart('/path', formData, { method: 'POST' })
  const requestMultipartPattern =
    /requestMultipart(?:<[\s\S]*?>)?\(\s*['"`]([^'"`]+)['"`]\s*,\s*[^,)\n]+(?:,\s*\{([\s\S]*?)\})?/g;
  collectCalls(requestMultipartPattern, 'POST');

  // fetch('/api/path', { method: 'POST' })
  let match: RegExpExecArray | null;
  const fetchPattern = /fetch\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([\s\S]*?)\})?/g;
  while ((match = fetchPattern.exec(content)) !== null) {
    const rawPath = match[1];
    if (rawPath === undefined || !rawPath.includes('/api/')) continue;
    const options = match[2] ?? '';
    const methodMatch = options.match(/method\s*:\s*['"]([A-Z]+)['"]/);
    const method = methodMatch?.[1] ?? 'GET';
    calls.push({
      method,
      path: normalizeClientPath(rawPath),
      file,
    });
  }

  return calls;
}

export function extractClientCalls(): ClientCall[] {
  const files = CLIENT_ROOTS.flatMap((root) => walkFiles(root));
  return files.flatMap((file) => extractClientCallsFromFile(file));
}

function pathsEquivalent(routePath: string, clientPath: string): boolean {
  const routeSegments = normalizeRoutePath(routePath).split('/').filter(Boolean);
  const clientSegments = normalizeClientPath(clientPath).split('/').filter(Boolean);

  if (routeSegments.length !== clientSegments.length) return false;

  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSeg = routeSegments[i];
    const clientSeg = clientSegments[i];
    if (routeSeg === undefined || clientSeg === undefined) return false;
    if (routeSeg.startsWith(':')) continue;
    if (routeSeg !== clientSeg) return false;
  }
  return true;
}

function isExcludedRoute(route: RouteManifestEntry): boolean {
  if (EXCLUDED_MODULES.has(route.module)) return true;
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(route.path));
}

export interface SyncResult {
  totalRoutes: number;
  excludedRoutes: number;
  coveredRoutes: number;
  uncoveredRoutes: UncoveredRoute[];
  methodMismatches: SyncMismatch[];
}

export function checkSync(manifest: RouteManifestEntry[]): SyncResult {
  const calls = extractClientCalls();
  const uncoveredRoutes: UncoveredRoute[] = [];
  const methodMismatches: SyncMismatch[] = [];
  let excludedRoutes = 0;

  for (const route of manifest) {
    if (isExcludedRoute(route)) {
      excludedRoutes += 1;
      continue;
    }

    const samePathCalls = calls.filter((call) => pathsEquivalent(route.path, call.path));
    if (samePathCalls.length === 0) {
      uncoveredRoutes.push({ route });
      continue;
    }

    const exactMethod = samePathCalls.some(
      (call) => call.method.toUpperCase() === route.method.toUpperCase(),
    );

    if (!exactMethod) {
      methodMismatches.push({
        route,
        calls: samePathCalls,
      });
    }
  }

  const coveredRoutes = manifest.length - excludedRoutes - uncoveredRoutes.length;

  return {
    totalRoutes: manifest.length,
    excludedRoutes,
    coveredRoutes,
    uncoveredRoutes,
    methodMismatches,
  };
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('api-client-sync') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  const shouldFailOnDrift = process.argv.includes('--fail-on-drift');
  const manifestPath = path.resolve('route-manifest.json');
  let manifest: RouteManifestEntry[];

  if (fs.existsSync(manifestPath)) {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    const jsonStart = rawManifest.indexOf('[');
    if (jsonStart < 0) {
      console.log('route-manifest.json does not contain valid JSON array output.');
      process.exit(1);
    }
    manifest = JSON.parse(rawManifest.slice(jsonStart)) as RouteManifestEntry[];
  } else {
    populateRegistryFromRouteMaps();
    manifest = generateManifest();
  }

  const result = checkSync(manifest);

  console.log('\nAPI Sync Report\n');
  console.log(`Total routes:       ${String(result.totalRoutes)}`);
  console.log(`Excluded routes:    ${String(result.excludedRoutes)}`);
  console.log(`Covered routes:     ${String(result.coveredRoutes)}`);
  console.log(`Uncovered routes:   ${String(result.uncoveredRoutes.length)}`);
  console.log(`Method mismatches:  ${String(result.methodMismatches.length)}`);

  if (result.methodMismatches.length > 0) {
    console.log('\nMethod mismatches:\n');
    for (const mismatch of result.methodMismatches) {
      const expected = `${mismatch.route.method.padEnd(6)} ${mismatch.route.path}`;
      console.log(`  expected ${expected}`);
      for (const call of mismatch.calls) {
        const rel = path.relative(process.cwd(), call.file);
        console.log(`    found ${call.method.padEnd(6)} ${call.path} in ${rel}`);
      }
      console.log('');
    }
  }

  if (result.uncoveredRoutes.length > 0) {
    console.log('\nUncovered routes:\n');
    for (const item of result.uncoveredRoutes) {
      console.log(`  ${item.route.method.padEnd(6)} ${item.route.path} (${item.route.module})`);
    }
  }

  const hasDrift = result.uncoveredRoutes.length > 0 || result.methodMismatches.length > 0;
  if (shouldFailOnDrift && hasDrift) {
    process.exit(1);
  }
}
