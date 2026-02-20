// main/tools/scripts/api/generate-hooks.ts
/**
 * React Query Hook Generator
 *
 * Generates typed React Query hook option factories and query key factories
 * from the generated route definitions in @bslt/api.
 *
 * The generated hooks are framework-agnostic option factories:
 * - GET routes produce query option factories (for useQuery)
 * - POST/PUT/PATCH/DELETE routes produce mutation option factories (for useMutation)
 *
 * Consumers use them with their own useQuery/useMutation implementations:
 *
 *   import { queryOptions, mutationOptions } from '@bslt/api/hooks';
 *   import { useQuery, useMutation } from '@bslt/react';
 *
 *   const { data } = useQuery(queryOptions.usersMe(client));
 *   const { mutate } = useMutation(mutationOptions.authLogin(client));
 *
 * Usage:
 *   pnpm api:generate-hooks
 */

import fs from 'node:fs';
import path from 'node:path';

import { generateManifest, populateRegistryFromRouteMaps } from '../audit/route-manifest';

type ManifestEntry = {
  path: string;
  method: string;
  isPublic: boolean;
  module: string;
};

// ============================================================================
// Naming Utilities
// ============================================================================

/**
 * Convert a kebab-case segment to PascalCase.
 */
function toPascal(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert a route path to a PascalCase identifier.
 *
 * Includes parameter names contextually to avoid collisions:
 *   /api/admin/billing/plans        -> AdminBillingPlans
 *   /api/admin/billing/plans/:id    -> AdminBillingPlansById
 *   /api/tenants/:id/members        -> TenantsByIdMembers
 *   /api/tenants/:id/members/:userId/role -> TenantsByIdMembersByUserIdRole
 *
 * Parameters become "By{ParamName}" in the name.
 */
function pathToName(routePath: string): string {
  const segments = routePath.replace(/^\/api\//, '').split('/');
  const parts: string[] = [];

  for (const segment of segments) {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      const pascalParam = paramName.charAt(0).toUpperCase() + paramName.slice(1);
      parts.push(`By${pascalParam}`);
    } else {
      parts.push(toPascal(segment));
    }
  }

  return parts.join('');
}

/**
 * Build a camelCase hook name from method + path.
 *
 * GET  /api/users/me              -> getUsersMe
 * GET  /api/admin/billing/plans/:id -> getAdminBillingPlansByIdId
 * POST /api/auth/login            -> mutateAuthLogin
 * PUT  /api/webhooks/:id/update   -> mutateWebhooksByIdUpdate
 */
function buildHookName(method: string, routePath: string): string {
  const pascalName = pathToName(routePath);
  const upper = method.toUpperCase();

  if (upper === 'GET') {
    return `get${pascalName}`;
  }
  return `mutate${pascalName}`;
}

/**
 * Build a query key factory name from a route path.
 * GET /api/users/me -> usersMe
 * GET /api/admin/billing/plans/:id -> adminBillingPlansByIdId
 */
function buildQueryKeyName(routePath: string): string {
  const pascal = pathToName(routePath);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Check whether a route path contains dynamic parameters.
 */
function hasParams(routePath: string): boolean {
  return routePath.includes(':');
}

/**
 * Extract parameter names from a route path.
 * "/api/tenants/:id/members/:userId/role" -> ["id", "userId"]
 */
function extractParams(routePath: string): string[] {
  const params: string[] = [];
  for (const segment of routePath.split('/')) {
    if (segment.startsWith(':')) {
      params.push(segment.slice(1));
    }
  }
  return params;
}

/**
 * Build a type-safe path substitution expression.
 * E.g. for "/api/tenants/:id/members/:userId" with params [id, userId]:
 *   `/api/tenants/${params.id}/members/${params.userId}`
 */
function buildPathExpression(routePath: string): string {
  // Replace :param with ${params.param}
  const expr = routePath.replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, '${params.$1}');
  return '`' + expr + '`';
}

// ============================================================================
// Code Generation
// ============================================================================

interface RouteGroup {
  queries: ManifestEntry[];
  mutations: ManifestEntry[];
}

function groupRoutes(entries: ManifestEntry[]): RouteGroup {
  const queries: ManifestEntry[] = [];
  const mutations: ManifestEntry[] = [];

  for (const entry of entries) {
    if (entry.method.toUpperCase() === 'GET') {
      queries.push(entry);
    } else {
      mutations.push(entry);
    }
  }

  return { queries, mutations };
}

function buildParamsType(params: string[]): string {
  return `{ ${params.map((p) => `${p}: string`).join('; ')} }`;
}

function generateQueryKeyFactories(queries: ManifestEntry[]): string {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const entry of queries) {
    const name = buildQueryKeyName(entry.path);
    if (seen.has(name)) continue;
    seen.add(name);

    const params = extractParams(entry.path);
    if (params.length > 0) {
      const paramsType = buildParamsType(params);
      lines.push(
        `  ${name}: (params: ${paramsType}) => [${JSON.stringify(entry.path)}, params] as const,`,
      );
    } else {
      lines.push(`  ${name}: () => [${JSON.stringify(entry.path)}] as const,`);
    }
  }

  return lines.join('\n');
}

function generateQueryOptionFactory(entry: ManifestEntry): string {
  const hookName = buildHookName(entry.method, entry.path);
  const params = extractParams(entry.path);
  const keyName = buildQueryKeyName(entry.path);
  const lines: string[] = [];

  if (params.length > 0) {
    const paramsType = buildParamsType(params);
    const pathExpr = buildPathExpression(entry.path);
    lines.push(`  ${hookName}(client: GeneratedClient, params: ${paramsType}) {`);
    lines.push(`    return {`);
    lines.push(`      queryKey: queryKeys.${keyName}(params),`);
    lines.push(
      `      queryFn: () => client.request({ path: ${pathExpr} as GeneratedApiPath, method: ${JSON.stringify(entry.method.toUpperCase())} as GeneratedApiMethod, }),`,
    );
    lines.push(`    };`);
    lines.push(`  },`);
  } else {
    lines.push(`  ${hookName}(client: GeneratedClient) {`);
    lines.push(`    return {`);
    lines.push(`      queryKey: queryKeys.${keyName}(),`);
    lines.push(
      `      queryFn: () => client.request({ path: ${JSON.stringify(entry.path)} as GeneratedApiPath, method: ${JSON.stringify(entry.method.toUpperCase())} as GeneratedApiMethod, }),`,
    );
    lines.push(`    };`);
    lines.push(`  },`);
  }

  return lines.join('\n');
}

function generateMutationOptionFactory(entry: ManifestEntry): string {
  const hookName = buildHookName(entry.method, entry.path);
  const params = extractParams(entry.path);
  const lines: string[] = [];

  if (params.length > 0) {
    const paramsType = buildParamsType(params);
    const pathExpr = buildPathExpression(entry.path);
    lines.push(
      `  ${hookName}(client: GeneratedClient, params: ${paramsType}) {`,
    );
    lines.push(`    return {`);
    lines.push(`      mutationFn: (body?: unknown) =>`);
    lines.push(
      `        client.request({ path: ${pathExpr} as GeneratedApiPath, method: ${JSON.stringify(entry.method.toUpperCase())} as GeneratedApiMethod, body, }),`,
    );
    lines.push(`    };`);
    lines.push(`  },`);
  } else {
    lines.push(`  ${hookName}(client: GeneratedClient) {`);
    lines.push(`    return {`);
    lines.push(`      mutationFn: (body?: unknown) =>`);
    lines.push(
      `        client.request({ path: ${JSON.stringify(entry.path)} as GeneratedApiPath, method: ${JSON.stringify(entry.method.toUpperCase())} as GeneratedApiMethod, body, }),`,
    );
    lines.push(`    };`);
    lines.push(`  },`);
  }

  return lines.join('\n');
}

function buildHooksSource(entries: ManifestEntry[]): string {
  const { queries, mutations } = groupRoutes(entries);

  const queryKeyFactoryLines = generateQueryKeyFactories(queries);
  const queryOptionLines = queries.map((e) => generateQueryOptionFactory(e)).join('\n\n');
  const mutationOptionLines = mutations
    .map((e) => generateMutationOptionFactory(e))
    .join('\n\n');

  return `// main/client/api/src/generated/hooks.ts
/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 *
 * Generated by: main/tools/scripts/api/generate-hooks.ts
 * Source: route definitions registered via route-manifest.
 *
 * Usage with @bslt/react query hooks:
 *
 *   import { queryKeys, queryOptions, mutationOptions } from '@bslt/api/hooks';
 *   import { useQuery, useMutation } from '@bslt/react';
 *
 *   // Query with typed key
 *   const { data } = useQuery(queryOptions.getUsersMe(client));
 *
 *   // Mutation
 *   const { mutate } = useMutation(mutationOptions.mutateAuthLogin(client));
 *
 *   // Manual cache invalidation
 *   cache.invalidateQuery(queryKeys.usersMe());
 */

import type { GeneratedApiMethod, GeneratedApiPath } from './client';

// ============================================================================
// Client Interface
// ============================================================================

/** Minimal client interface expected by generated hooks. */
export interface GeneratedClient {
  request: (payload: {
    path: GeneratedApiPath;
    method: GeneratedApiMethod;
    body?: unknown;
    query?: Record<string, string | number | boolean | null | undefined>;
    headers?: HeadersInit;
    signal?: AbortSignal;
  }) => Promise<unknown>;
}

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Type-safe query key factories for all GET routes.
 * Use these for cache invalidation, prefetching, and query matching.
 */
export const queryKeys = {
${queryKeyFactoryLines}
} as const;

// ============================================================================
// Query Option Factories (GET routes)
// ============================================================================

/**
 * Query option factories for all GET routes.
 * Returns objects compatible with useQuery({ queryKey, queryFn }).
 */
export const queryOptions = {
${queryOptionLines}
} as const;

// ============================================================================
// Mutation Option Factories (POST/PUT/PATCH/DELETE routes)
// ============================================================================

/**
 * Mutation option factories for all non-GET routes.
 * Returns objects compatible with useMutation({ mutationFn }).
 */
export const mutationOptions = {
${mutationOptionLines}
} as const;
`;
}

// ============================================================================
// Entry Point
// ============================================================================

function run(): void {
  populateRegistryFromRouteMaps();
  const manifest = generateManifest() as ManifestEntry[];

  const outputDir = path.resolve('main/client/api/src/generated');
  fs.mkdirSync(outputDir, { recursive: true });

  const hooksPath = path.join(outputDir, 'hooks.ts');
  const content = buildHooksSource(manifest);
  fs.writeFileSync(hooksPath, content, 'utf8');

  const getCount = manifest.filter((e) => e.method.toUpperCase() === 'GET').length;
  const mutationCount = manifest.length - getCount;

  process.stdout.write(
    `Generated ${String(getCount)} query + ${String(mutationCount)} mutation hook factories -> ${hooksPath}\n`,
  );
}

run();
