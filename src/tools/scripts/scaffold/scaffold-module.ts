// src/tools/scripts/scaffold/scaffold-module.ts
/**
 * Module Scaffold CLI
 *
 * Generates a complete module skeleton in src/server/core/src/<name>/
 * following the established pattern (activities module as reference).
 *
 * Usage: pnpm scaffold:module <name>
 *
 * @module tools/scaffold
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const CORE_DIR = path.resolve('src/server/core/src');
const ROUTES_FILE = path.resolve('src/apps/server/src/routes/routes.ts');
const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate the module name is kebab-case and does not already exist.
 *
 * @param name - Module name to validate
 * @returns Error message, or null if valid
 */
export function validateModuleName(name: string): string | null {
  if (!KEBAB_RE.test(name)) {
    return `Invalid module name "${name}". Must be kebab-case (e.g., "my-module").`;
  }

  const targetDir = path.join(CORE_DIR, name);
  if (fs.existsSync(targetDir)) {
    return `Module "${name}" already exists at ${targetDir}`;
  }

  return null;
}

// ============================================================================
// Template Generators
// ============================================================================

/**
 * Convert kebab-case to PascalCase.
 * @example toPascalCase('my-module') => 'MyModule'
 */
export function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/**
 * Convert kebab-case to camelCase.
 * @example toCamelCase('my-module') => 'myModule'
 */
export function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate the file templates for a module.
 *
 * @param name - kebab-case module name
 * @returns Map of filename to file content
 */
export function generateTemplates(name: string): Map<string, string> {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const files = new Map<string, string>();

  // types.ts
  files.set(
    'types.ts',
    `// src/server/core/src/${name}/types.ts
/**
 * ${pascal} Module Types
 *
 * Narrow dependency interfaces for the ${name} module.
 */

import type { BaseContext } from '@abe-stack/shared/core';

/**
 * Application context for ${name} handlers.
 * Extend with module-specific repositories as needed.
 */
export interface ${pascal}AppContext extends BaseContext {
  readonly repos: Record<string, unknown>;
}
`,
  );

  // service.ts
  files.set(
    'service.ts',
    `// src/server/core/src/${name}/service.ts
/**
 * ${pascal} Service
 *
 * Pure business logic for ${name} operations.
 * No HTTP awareness — returns domain objects or throws errors.
 */

import type { ${pascal}AppContext } from './types';

/**
 * List ${name} items.
 *
 * @param ctx - Module application context
 * @returns Array of items (placeholder)
 */
export async function list${pascal}(
  ctx: ${pascal}AppContext,
): Promise<unknown[]> {
  ctx.log.info('Listing ${name}');
  return [];
}
`,
  );

  // service.test.ts
  files.set(
    'service.test.ts',
    `// src/server/core/src/${name}/service.test.ts
import { describe, expect, test, vi } from 'vitest';

import { list${pascal} } from './service';

import type { ${pascal}AppContext } from './types';

function createMockContext(): ${pascal}AppContext {
  return {
    db: {} as ${pascal}AppContext['db'],
    repos: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

describe('${name} service', () => {
  test('list${pascal} returns empty array by default', async () => {
    const ctx = createMockContext();
    const result = await list${pascal}(ctx);

    expect(result).toEqual([]);
  });
});
`,
  );

  // handlers.ts
  files.set(
    'handlers.ts',
    `// src/server/core/src/${name}/handlers.ts
/**
 * ${pascal} Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { list${pascal} } from './service';

import type { ${pascal}AppContext } from './types';
import type { HandlerContext } from '@abe-stack/server-engine';
import type { FastifyReply, FastifyRequest } from 'fastify';

function asAppContext(ctx: HandlerContext): ${pascal}AppContext {
  return ctx as unknown as ${pascal}AppContext;
}

/**
 * List ${name} items.
 */
export async function handleList${pascal}(
  ctx: HandlerContext,
  _body: unknown,
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: 200; body: { items: unknown[] } } | { status: 500; body: { message: string } }> {
  const appCtx = asAppContext(ctx);

  try {
    const items = await list${pascal}(appCtx);
    return { status: 200, body: { items } };
  } catch (error: unknown) {
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return { status: 500, body: { message: 'Failed to list ${name}' } };
  }
}
`,
  );

  // handlers.test.ts
  files.set(
    'handlers.test.ts',
    `// src/server/core/src/${name}/handlers.test.ts
import { describe, expect, test, vi } from 'vitest';

import { handleList${pascal} } from './handlers';

import type { HandlerContext } from '@abe-stack/server-engine';
import type { FastifyReply, FastifyRequest } from 'fastify';

function createMockContext(): HandlerContext {
  return {
    db: {} as HandlerContext['db'],
    repos: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

describe('${name} handlers', () => {
  test('handleList${pascal} returns 200 with items', async () => {
    const ctx = createMockContext();
    const result = await handleList${pascal}(
      ctx,
      undefined,
      {} as FastifyRequest,
      {} as FastifyReply,
    );

    expect(result.status).toBe(200);
    expect((result as { body: { items: unknown[] } }).body.items).toEqual([]);
  });
});
`,
  );

  // routes.ts
  files.set(
    'routes.ts',
    `// src/server/core/src/${name}/routes.ts
/**
 * ${pascal} Routes
 *
 * Route definitions for the ${name} module.
 */

import { createRouteMap, protectedRoute } from '@abe-stack/server-engine';

import { handleList${pascal} } from './handlers';

import type { RouteDefinition } from '@abe-stack/server-engine';

const ${camel}RouteEntries: [string, RouteDefinition][] = [
  ['${name}', protectedRoute('GET', handleList${pascal}, 'user')],
];

export const ${camel}Routes = createRouteMap(${camel}RouteEntries);
`,
  );

  // index.ts
  files.set(
    'index.ts',
    `// src/server/core/src/${name}/index.ts
/**
 * ${pascal} Module
 */

// Service
export { list${pascal} } from './service';

// Handlers
export { handleList${pascal} } from './handlers';

// Routes
export { ${camel}Routes } from './routes';

// Types
export type { ${pascal}AppContext } from './types';
`,
  );

  return files;
}

// ============================================================================
// Route Registration Patching
// ============================================================================

/**
 * Add the module's route import and registerRouteMap call to routes.ts.
 *
 * @param name - kebab-case module name
 * @param routesFilePath - Path to the routes.ts file (for testing)
 */
export function patchRoutesFile(name: string, routesFilePath: string = ROUTES_FILE): void {
  const camel = toCamelCase(name);
  const content = fs.readFileSync(routesFilePath, 'utf-8');

  // Add import after last @abe-stack/core/* import
  const importLine = `import { ${camel}Routes } from '@abe-stack/core/${name}';`;
  const lastCoreImport = content.lastIndexOf("from '@abe-stack/core/");
  const nextNewline = content.indexOf('\n', lastCoreImport);
  const withImport =
    content.slice(0, nextNewline + 1) +
    importLine +
    '\n' +
    content.slice(nextNewline + 1);

  // Add registerRouteMap call before the system routes comment
  const registrationLine = `  registerRouteMap(app, handlerCtx, ${camel}Routes as unknown as DbRouteMap, {\n    ...routerOptions,\n    module: '${name}',\n  });`;
  const systemRoutesMarker = '  // System routes';
  const insertionIdx = withImport.indexOf(systemRoutesMarker);

  if (insertionIdx === -1) {
    console.warn('⚠️  Could not find system routes marker in routes.ts. Skipping route registration.');
    return;
  }

  const patched =
    withImport.slice(0, insertionIdx) +
    registrationLine +
    '\n' +
    withImport.slice(insertionIdx);

  fs.writeFileSync(routesFilePath, patched, 'utf-8');
}

// ============================================================================
// Main Scaffold Function
// ============================================================================

/**
 * Scaffold a new module.
 *
 * @param name - kebab-case module name
 * @param options.dryRun - Print files without writing
 * @param options.skipRoutes - Don't patch routes.ts
 * @returns Array of created file paths
 */
export function scaffoldModule(
  name: string,
  options: { dryRun?: boolean; skipRoutes?: boolean } = {},
): string[] {
  const error = validateModuleName(name);
  if (error !== null) {
    throw new Error(error);
  }

  const targetDir = path.join(CORE_DIR, name);
  const templates = generateTemplates(name);
  const createdFiles: string[] = [];

  if (!options.dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const [filename, content] of templates) {
    const filePath = path.join(targetDir, filename);
    createdFiles.push(filePath);

    if (!options.dryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }

  if (!options.dryRun && !options.skipRoutes) {
    patchRoutesFile(name);
  }

  return createdFiles;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('scaffold-module') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  const name = process.argv[2];

  if (name === undefined || name === '') {
    console.error('Usage: pnpm scaffold:module <name>');
    console.error('  <name> must be kebab-case (e.g., "my-module")');
    process.exit(1);
  }

  try {
    const files = scaffoldModule(name);
    console.log(`\n✅ Module "${name}" scaffolded successfully!\n`);
    console.log('Created files:');
    for (const f of files) {
      console.log(`  ${path.relative(process.cwd(), f)}`);
    }
    console.log(`\nRoute registration added to routes.ts`);
    console.log(`\nNext steps:`);
    console.log(`  1. Add your repository types to types.ts`);
    console.log(`  2. Implement your service functions in service.ts`);
    console.log(`  3. Add handler logic in handlers.ts`);
    console.log(`  4. Define route endpoints in routes.ts`);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
