// main/tools/scripts/audit/verify-scaffold.ts
/**
 * Module Scaffold Verification
 *
 * Verifies the scaffold-module tool produces correct output:
 * 1. Expected files exist with correct names
 * 2. Barrel exports use named exports (no `export *`)
 * 3. Generated files are valid TypeScript structure
 * 4. Cleans up after itself
 */

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  generateTemplates,
  scaffoldModule,
  toCamelCase,
  toPascalCase,
  validateModuleName,
} from '../scaffold/scaffold-module';

// ============================================================================
// Constants
// ============================================================================

const TEST_MODULE_NAME = '_verify-scaffold-test';
const CORE_DIR = resolve('main/server/core/src');
const MODULE_DIR = join(CORE_DIR, TEST_MODULE_NAME);

const EXPECTED_FILES = [
  'index.ts',
  'types.ts',
  'service.ts',
  'service.test.ts',
  'handlers.ts',
  'handlers.test.ts',
  'routes.ts',
];

// ============================================================================
// Checks
// ============================================================================

let failures = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    console.log(`  FAIL: ${label}`);
    failures++;
  }
}

function cleanup(): void {
  if (existsSync(MODULE_DIR)) {
    rmSync(MODULE_DIR, { recursive: true, force: true });
  }
}

// ============================================================================
// Verification Steps
// ============================================================================

function verifyHelpers(): void {
  console.log('\n1. Helper functions');
  check('toPascalCase("my-module") === "MyModule"', toPascalCase('my-module') === 'MyModule');
  check('toCamelCase("my-module") === "myModule"', toCamelCase('my-module') === 'myModule');
  check('validateModuleName("valid-name") === null', validateModuleName('valid-name') === null);
  check('validateModuleName("INVALID") returns error', validateModuleName('INVALID') !== null);
}

function verifyTemplateGeneration(): void {
  console.log('\n2. Template generation');
  const templates = generateTemplates('test-mod');
  check(
    `generates ${String(EXPECTED_FILES.length)} files`,
    templates.size === EXPECTED_FILES.length,
  );

  for (const file of EXPECTED_FILES) {
    check(`template includes ${file}`, templates.has(file));
  }
}

function verifyDryRun(): void {
  console.log('\n3. Dry run (no file creation)');
  cleanup();

  const files = scaffoldModule(TEST_MODULE_NAME, { dryRun: true, skipRoutes: true });
  check(
    `dry run returns ${String(EXPECTED_FILES.length)} file paths`,
    files.length === EXPECTED_FILES.length,
  );
  check('module directory NOT created', !existsSync(MODULE_DIR));
}

function verifyFileCreation(): void {
  console.log('\n4. File creation');
  cleanup();

  scaffoldModule(TEST_MODULE_NAME, { skipRoutes: true });
  check('module directory created', existsSync(MODULE_DIR));

  for (const file of EXPECTED_FILES) {
    const filePath = join(MODULE_DIR, file);
    check(`${file} exists`, existsSync(filePath));
  }
}

function verifyBarrelExports(): void {
  console.log('\n5. Barrel export quality');
  const indexPath = join(MODULE_DIR, 'index.ts');
  if (!existsSync(indexPath)) {
    check('index.ts exists for barrel check', false);
    return;
  }

  const content = readFileSync(indexPath, 'utf-8');
  check('no wildcard exports (export *)', !content.includes('export *'));
  check('uses named exports', content.includes('export {'));
  check('exports type keyword', content.includes('export type'));
}

function verifyFileContent(): void {
  console.log('\n6. File content quality');

  for (const file of EXPECTED_FILES) {
    const filePath = join(MODULE_DIR, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    check(`${file} has file header comment`, content.startsWith('// '));
    check(`${file} is non-empty`, content.trim().length > 0);
    check(`${file} has no "any" type`, !content.includes(': any'));
  }
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log('Module Scaffold Verification\n');

  try {
    verifyHelpers();
    verifyTemplateGeneration();
    verifyDryRun();
    verifyFileCreation();
    verifyBarrelExports();
    verifyFileContent();
  } finally {
    // Always clean up
    cleanup();
    console.log('\n7. Cleanup');
    check('test module removed', !existsSync(MODULE_DIR));
  }

  console.log('\n' + '-'.repeat(40));
  if (failures > 0) {
    console.error(`FAIL: ${String(failures)} check(s) failed.`);
    process.exit(1);
  }

  console.log('PASS: All checks passed.');
}

main();
