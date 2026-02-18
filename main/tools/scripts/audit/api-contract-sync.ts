// main/tools/scripts/audit/api-contract-sync.ts
/**
 * API Contract Sync Validator
 *
 * Compares shared `apiRouter` contract endpoints with server route manifest entries.
 *
 * Usage:
 *   node --import tsx main/tools/scripts/audit/api-contract-sync.ts
 *   node --import tsx main/tools/scripts/audit/api-contract-sync.ts --fail-on-drift
 *
 * If `route-manifest.json` exists, it is used. Otherwise routes are registered
 * from source and analyzed in-memory.
 */

import fs from 'node:fs';
import path from 'node:path';

import { apiRouter } from '@bslt/shared';
import { generateManifest, populateRegistryFromRouteMaps } from './route-manifest';

import type { Contract, EndpointContract } from '@bslt/shared';
import type { RouteManifestEntry } from './route-manifest';

type EndpointKey = `${Uppercase<string>} ${string}`;

type ContractEndpoint = {
  domain: string;
  key: string;
  method: string;
  path: string;
};

type DriftResult = {
  contractOnly: ContractEndpoint[];
  routeOnly: RouteManifestEntry[];
  totalContracts: number;
  totalRoutes: number;
  excludedRoutes: number;
};

const EXCLUDED_ROUTE_MODULES = new Set([
  'system',
  'realtime',
  'files',
  'tenants',
  'legal',
  'consent',
  'data-export',
  'activities',
  'feature-flags',
]);

function normalizePath(p: string): string {
  const withPrefix = p.startsWith('/api/') ? p : `/api${p.startsWith('/') ? '' : '/'}${p}`;
  return withPrefix.replace(/\/+/g, '/');
}

function endpointKey(method: string, pathValue: string): EndpointKey {
  return `${method.toUpperCase()} ${normalizePath(pathValue)}` as EndpointKey;
}

function isEndpointContract(value: unknown): value is EndpointContract {
  if (value === null || value === undefined || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['method'] === 'string' && typeof obj['path'] === 'string';
}

function flattenContract(domain: string, contract: Contract): ContractEndpoint[] {
  return Object.entries(contract)
    .filter(([, endpoint]) => isEndpointContract(endpoint))
    .map(([key, endpoint]) => ({
      domain,
      key,
      method: endpoint.method,
      path: normalizePath(endpoint.path),
    }));
}

function getContractEndpoints(): ContractEndpoint[] {
  return Object.entries(apiRouter).flatMap(([domain, contract]) =>
    flattenContract(domain, contract as unknown as Contract),
  );
}

function loadRouteManifest(): RouteManifestEntry[] {
  const manifestPath = path.resolve('route-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    populateRegistryFromRouteMaps();
    return generateManifest();
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const jsonStart = raw.indexOf('[');
  if (jsonStart < 0) {
    throw new Error('route-manifest.json does not contain valid JSON array output');
  }

  return JSON.parse(raw.slice(jsonStart)) as RouteManifestEntry[];
}

function compare(contractEndpoints: ContractEndpoint[], routes: RouteManifestEntry[]): DriftResult {
  const contractMap = new Map<EndpointKey, ContractEndpoint>();
  for (const endpoint of contractEndpoints) {
    contractMap.set(endpointKey(endpoint.method, endpoint.path), endpoint);
  }

  const filteredRoutes = routes.filter((route) => !EXCLUDED_ROUTE_MODULES.has(route.module));
  const routeMap = new Map<EndpointKey, RouteManifestEntry>();
  for (const route of filteredRoutes) {
    routeMap.set(endpointKey(route.method, route.path), route);
  }

  const contractOnly: ContractEndpoint[] = [];
  for (const [key, endpoint] of contractMap) {
    if (!routeMap.has(key)) {
      contractOnly.push(endpoint);
    }
  }

  const routeOnly: RouteManifestEntry[] = [];
  for (const [key, route] of routeMap) {
    if (!contractMap.has(key)) {
      routeOnly.push(route);
    }
  }

  return {
    contractOnly,
    routeOnly,
    totalContracts: contractEndpoints.length,
    totalRoutes: routes.length,
    excludedRoutes: routes.length - filteredRoutes.length,
  };
}

function printReport(result: DriftResult): void {
  console.log('\nAPI Contract Sync Report\n');
  console.log(`Contract endpoints: ${String(result.totalContracts)}`);
  console.log(`Route endpoints:    ${String(result.totalRoutes)}`);
  console.log(`Excluded routes:    ${String(result.excludedRoutes)}`);
  console.log(`Contract-only:      ${String(result.contractOnly.length)}`);
  console.log(`Route-only:         ${String(result.routeOnly.length)}`);

  if (result.contractOnly.length > 0) {
    console.log('\nContract-only endpoints (in apiRouter, missing from routes):\n');
    for (const item of result.contractOnly) {
      console.log(`  ${item.method.padEnd(6)} ${item.path} (${item.domain}.${item.key})`);
    }
  }

  if (result.routeOnly.length > 0) {
    console.log('\nRoute-only endpoints (in routes, missing from apiRouter):\n');
    for (const item of result.routeOnly) {
      console.log(`  ${item.method.padEnd(6)} ${item.path} (${item.module})`);
    }
  }
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('api-contract-sync') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  const shouldFailOnDrift = process.argv.includes('--fail-on-drift');

  try {
    const contracts = getContractEndpoints();
    const routes = loadRouteManifest();
    const result = compare(contracts, routes);
    printReport(result);

    const hasDrift = result.contractOnly.length > 0 || result.routeOnly.length > 0;
    if (shouldFailOnDrift && hasDrift) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
