// main/tools/scripts/build/generate-api-client.ts
/**
 * API Client Generator
 *
 * Reads route registry entries (collected at server startup) from a JSON
 * manifest file and generates a typed TypeScript fetch client with one
 * method per endpoint.
 *
 * Usage:
 *   npx tsx main/tools/scripts/build/generate-api-client.ts [manifest.json] [output.ts]
 *
 * The manifest file is produced by the server's admin/manifest endpoint
 * or by running the route registration and calling `getRegisteredRoutes()`.
 *
 * Output is a self-contained TypeScript module with zero runtime dependencies
 * (uses native `fetch`).
 *
 * @module tools/generate-api-client
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Types
// ============================================================================

/**
 * Route entry as stored in the manifest JSON.
 * Matches the shape of RouteRegistryEntry from route.registry.ts.
 */
interface ManifestRouteEntry {
  /** Full URL path, e.g. "/api/auth/login" */
  path: string;
  /** HTTP method */
  method: string;
  /** Whether the route is publicly accessible */
  isPublic: boolean;
  /** Required roles */
  roles: string[];
  /** Whether the route has a validation schema */
  hasSchema: boolean;
  /** Logical module name */
  module: string;
  /** Whether the route is deprecated */
  deprecated?: boolean;
  /** Short description */
  summary?: string;
  /** OpenAPI tags */
  tags?: string[];
}

/**
 * Options for the code generator.
 */
interface GeneratorOptions {
  /** Routes to generate methods for */
  routes: ManifestRouteEntry[];
  /** Base URL variable name in generated code. Defaults to 'baseUrl'. */
  baseUrlParam?: string;
  /** Whether to include JSDoc comments. Defaults to true. */
  includeJsDoc?: boolean;
  /** Whether to mark deprecated routes. Defaults to true. */
  markDeprecated?: boolean;
}

// ============================================================================
// Naming Utilities
// ============================================================================

/**
 * Convert a route path to a valid TypeScript method name.
 * E.g., "/api/auth/login" -> "authLogin"
 *       "/api/users/:id" -> "usersById"
 *       "/api/realtime/getRecords" -> "realtimeGetRecords"
 *
 * @param routePath - Full URL path
 * @param method - HTTP method (used to disambiguate same-path routes)
 * @returns Valid TypeScript identifier
 */
function pathToMethodName(routePath: string, method: string): string {
  // Remove /api/ prefix
  let cleaned = routePath.replace(/^\/api\//, '');

  // Replace path parameters (:id, :userId) with "By{Param}"
  cleaned = cleaned.replace(/:([a-zA-Z]+)/g, (_match, param: string) => {
    return 'By' + param.charAt(0).toUpperCase() + param.slice(1);
  });

  // Split on / and - and convert to camelCase
  const parts = cleaned.split(/[/\-]+/).filter((p) => p.length > 0);
  if (parts.length === 0) return method.toLowerCase();

  const camelCase = parts
    .map((part, index) => {
      if (index === 0) return part.charAt(0).toLowerCase() + part.slice(1);
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');

  // Prepend method for non-unique names (GET vs POST on same path)
  const needsMethodPrefix = method !== 'GET' && method !== 'POST';
  if (needsMethodPrefix) {
    return method.toLowerCase() + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  return camelCase;
}

/**
 * Determine the TypeScript type for a route's request body.
 * Without full schema introspection, we use `unknown` as default.
 * This can be refined with schema analysis in future iterations.
 */
function getRequestBodyType(route: ManifestRouteEntry): string {
  if (route.method === 'GET' || route.method === 'DELETE') {
    return 'never';
  }
  return 'unknown';
}

/**
 * Extract path parameters from a route path.
 * E.g., "/api/users/:id" -> ["id"]
 */
function extractPathParams(routePath: string): string[] {
  const params: string[] = [];
  const regex = /:([a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(routePath)) !== null) {
    if (match[1] !== undefined) {
      params.push(match[1]);
    }
  }
  return params;
}

/**
 * Convert a route path with :params to a template-literal-friendly version.
 * E.g., "/api/users/:id" -> "/api/users/${params.id}"
 */
function pathToTemplate(routePath: string): string {
  return routePath.replace(/:([a-zA-Z]+)/g, '${params.$1}');
}

// ============================================================================
// Code Generator
// ============================================================================

/**
 * Generate the TypeScript API client source code.
 *
 * @param options - Generator options
 * @returns Generated TypeScript source code string
 */
export function generateApiClientSource(options: GeneratorOptions): string {
  const {
    routes,
    baseUrlParam = 'baseUrl',
    includeJsDoc = true,
    markDeprecated = true,
  } = options;

  const lines: string[] = [];

  // ---- File Header ----
  lines.push('// Auto-generated API client. Do not edit manually.');
  lines.push('// Generated by: main/tools/scripts/build/generate-api-client.ts');
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push(`// Route count: ${String(routes.length)}`);
  lines.push('');

  // ---- Types ----
  lines.push('// ============================================================================');
  lines.push('// Types');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push('export interface ApiClientConfig {');
  lines.push('  /** Base URL for API requests (e.g., "https://api.example.com") */');
  lines.push(`  ${baseUrlParam}: string;`);
  lines.push('  /** Default headers to include in every request */');
  lines.push('  headers?: Record<string, string>;');
  lines.push('  /** Custom fetch implementation (defaults to global fetch) */');
  lines.push('  fetch?: typeof fetch;');
  lines.push('  /** Request credentials mode (defaults to "same-origin") */');
  lines.push('  credentials?: RequestCredentials;');
  lines.push('}');
  lines.push('');
  lines.push('export interface ApiResponse<T = unknown> {');
  lines.push('  /** HTTP status code */');
  lines.push('  status: number;');
  lines.push('  /** Whether the response status is 2xx */');
  lines.push('  ok: boolean;');
  lines.push('  /** Parsed response body */');
  lines.push('  data: T;');
  lines.push('  /** Response headers */');
  lines.push('  headers: Headers;');
  lines.push('}');
  lines.push('');
  lines.push('export class ApiError extends Error {');
  lines.push('  constructor(');
  lines.push('    public readonly status: number,');
  lines.push('    public readonly data: unknown,');
  lines.push('    message?: string,');
  lines.push('  ) {');
  lines.push('    super(message ?? `API error: ${String(status)}`);');
  lines.push("    this.name = 'ApiError';");
  lines.push('  }');
  lines.push('}');
  lines.push('');

  // ---- Path Params Interface ----
  // Collect unique param interfaces
  const paramInterfaces = new Map<string, string[]>();
  for (const route of routes) {
    const params = extractPathParams(route.path);
    if (params.length > 0) {
      const ifaceName = pathToMethodName(route.path, route.method) + 'Params';
      paramInterfaces.set(ifaceName, params);
    }
  }

  if (paramInterfaces.size > 0) {
    lines.push('// Path parameter interfaces');
    for (const [name, params] of paramInterfaces) {
      lines.push(`export interface ${name.charAt(0).toUpperCase() + name.slice(1)} {`);
      for (const param of params) {
        lines.push(`  ${param}: string;`);
      }
      lines.push('}');
      lines.push('');
    }
  }

  // ---- Client Class ----
  lines.push('// ============================================================================');
  lines.push('// Generated API Client');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push('export class GeneratedApiClient {');
  lines.push(`  private readonly ${baseUrlParam}: string;`);
  lines.push('  private readonly defaultHeaders: Record<string, string>;');
  lines.push('  private readonly fetchFn: typeof fetch;');
  lines.push('  private readonly credentials: RequestCredentials;');
  lines.push('');
  lines.push('  constructor(config: ApiClientConfig) {');
  lines.push(`    this.${baseUrlParam} = config.${baseUrlParam}.replace(/\\/+$/, '');`);
  lines.push("    this.defaultHeaders = config.headers ?? {};");
  lines.push('    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);');
  lines.push("    this.credentials = config.credentials ?? 'same-origin';");
  lines.push('  }');
  lines.push('');

  // ---- Private request helper ----
  lines.push('  private async request<T>(');
  lines.push('    method: string,');
  lines.push('    path: string,');
  lines.push('    body?: unknown,');
  lines.push('    extraHeaders?: Record<string, string>,');
  lines.push('  ): Promise<ApiResponse<T>> {');
  lines.push(`    const url = \`\${this.${baseUrlParam}}\${path}\`;`);
  lines.push('    const headers: Record<string, string> = {');
  lines.push('      ...this.defaultHeaders,');
  lines.push('      ...extraHeaders,');
  lines.push('    };');
  lines.push('');
  lines.push("    if (body !== undefined && body !== null) {");
  lines.push("      headers['Content-Type'] = 'application/json';");
  lines.push('    }');
  lines.push('');
  lines.push('    const response = await this.fetchFn(url, {');
  lines.push('      method,');
  lines.push('      headers,');
  lines.push('      credentials: this.credentials,');
  lines.push("      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,");
  lines.push('    });');
  lines.push('');
  lines.push('    let data: T;');
  lines.push("    const contentType = response.headers.get('content-type') ?? '';");
  lines.push("    if (contentType.includes('application/json')) {");
  lines.push('      data = (await response.json()) as T;');
  lines.push('    } else {');
  lines.push('      data = (await response.text()) as unknown as T;');
  lines.push('    }');
  lines.push('');
  lines.push('    if (!response.ok) {');
  lines.push('      throw new ApiError(response.status, data);');
  lines.push('    }');
  lines.push('');
  lines.push('    return {');
  lines.push('      status: response.status,');
  lines.push('      ok: response.ok,');
  lines.push('      data,');
  lines.push('      headers: response.headers,');
  lines.push('    };');
  lines.push('  }');
  lines.push('');

  // ---- Generated Methods ----
  // Track method names for deduplication
  const usedNames = new Map<string, number>();

  for (const route of routes) {
    let methodName = pathToMethodName(route.path, route.method);

    // Deduplicate method names
    const count = usedNames.get(methodName) ?? 0;
    usedNames.set(methodName, count + 1);
    if (count > 0) {
      methodName = `${methodName}${route.method.charAt(0).toUpperCase() + route.method.slice(1).toLowerCase()}`;
    }

    const pathParams = extractPathParams(route.path);
    const hasPathParams = pathParams.length > 0;
    const hasBody = route.method === 'POST' || route.method === 'PUT' || route.method === 'PATCH';
    const bodyType = getRequestBodyType(route);

    // Build method signature parts
    const sigParts: string[] = [];
    if (hasPathParams) {
      const paramType = `{ ${pathParams.map((p) => `${p}: string`).join('; ')} }`;
      sigParts.push(`params: ${paramType}`);
    }
    if (hasBody) {
      sigParts.push(`body: ${bodyType}`);
    }

    const signature = sigParts.join(', ');
    const pathExpr = hasPathParams
      ? '`' + pathToTemplate(route.path) + '`'
      : `'${route.path}'`;
    const bodyArg = hasBody ? 'body' : 'undefined';

    // JSDoc
    if (includeJsDoc) {
      lines.push('  /**');
      if (route.summary !== undefined && route.summary !== '') {
        lines.push(`   * ${route.summary}`);
      } else {
        lines.push(`   * ${route.method} ${route.path}`);
      }
      if (route.isPublic) {
        lines.push('   * @auth Public');
      } else if (route.roles.length > 0) {
        lines.push(`   * @auth Roles: ${route.roles.join(', ')}`);
      } else {
        lines.push('   * @auth Authenticated');
      }
      if (markDeprecated && route.deprecated === true) {
        lines.push('   * @deprecated');
      }
      lines.push('   */');
    }

    lines.push(`  async ${methodName}(${signature}): Promise<ApiResponse> {`);
    lines.push(`    return this.request('${route.method}', ${pathExpr}, ${bodyArg});`);
    lines.push('  }');
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  // ---- Factory Function ----
  lines.push('// ============================================================================');
  lines.push('// Factory');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push('/**');
  lines.push(' * Create a typed API client instance.');
  lines.push(' *');
  lines.push(' * @param config - Client configuration');
  lines.push(' * @returns Generated API client');
  lines.push(' */');
  lines.push('export function createGeneratedApiClient(config: ApiClientConfig): GeneratedApiClient {');
  lines.push('  return new GeneratedApiClient(config);');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * Read the manifest file and generate the API client.
 */
function main(): void {
  const args = process.argv.slice(2);
  const manifestPath = args[0] ?? 'api-manifest.json';
  const outputPath = args[1] ?? 'generated-api-client.ts';

  const resolvedManifest = path.resolve(process.cwd(), manifestPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(resolvedManifest)) {
    console.error(`Manifest file not found: ${resolvedManifest}`);
    console.error('');
    console.error('Usage: npx tsx generate-api-client.ts [manifest.json] [output.ts]');
    console.error('');
    console.error("Generate a manifest by calling your server's admin/manifest endpoint");
    console.error('or by running getRegisteredRoutes() and writing the result to JSON.');
    process.exit(1);
  }

  const manifestContent = fs.readFileSync(resolvedManifest, 'utf-8');
  let routes: ManifestRouteEntry[];

  try {
    const parsed: unknown = JSON.parse(manifestContent);
    if (Array.isArray(parsed)) {
      routes = parsed as ManifestRouteEntry[];
    } else if (typeof parsed === 'object' && parsed !== null && 'routes' in parsed) {
      routes = (parsed as { routes: ManifestRouteEntry[] }).routes;
    } else {
      throw new Error('Unexpected manifest format');
    }
  } catch (err) {
    console.error(`Failed to parse manifest: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log(`Read ${String(routes.length)} routes from ${resolvedManifest}`);

  const source = generateApiClientSource({ routes });

  fs.writeFileSync(resolvedOutput, source, 'utf-8');
  console.log(`Generated API client written to ${resolvedOutput}`);
}

// Only run main when executed directly (not imported)
if (process.argv[1] !== undefined && process.argv[1].includes('generate-api-client')) {
  main();
}
