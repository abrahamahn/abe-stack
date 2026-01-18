// config/generators/package.gen.ts
/**
 * Package.json Generator
 *
 * Updates:
 * - Root package.json scripts and lint-staged config
 *
 * Note: This generator merges with existing package.json, preserving
 * dependencies and other fields while updating scripts.
 */

import * as path from 'path';
import * as fs from 'fs';

import { lintStaged, packageJsonScripts } from '../schema/lint';
import { createLogger, readJsonFile, ROOT, writeJsonFile } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Update root package.json with schema-defined scripts and lint-staged config
 */
export function generatePackageJson(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nGenerating package.json updates...');

  const packageJsonPath = path.join(ROOT, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    result.errors.push('Root package.json not found');
    return result;
  }

  const pkg = readJsonFile<Record<string, unknown>>(packageJsonPath);
  if (!pkg) {
    result.errors.push('Failed to read root package.json');
    return result;
  }

  let needsUpdate = false;
  const updatedPkg = { ...pkg };

  // Update scripts from linting schema
  const existingScripts = (pkg.scripts as Record<string, string>) ?? {};
  const updatedScripts = { ...existingScripts };

  for (const [key, value] of Object.entries(packageJsonScripts)) {
    if (existingScripts[key] !== value) {
      updatedScripts[key] = value;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    updatedPkg.scripts = updatedScripts;
  }

  // Update lint-staged config
  const existingLintStaged = pkg['lint-staged'];
  if (JSON.stringify(existingLintStaged) !== JSON.stringify(lintStaged)) {
    updatedPkg['lint-staged'] = lintStaged;
    needsUpdate = true;
  }

  if (checkOnly) {
    if (needsUpdate) {
      result.generated.push(packageJsonPath);
    } else {
      result.unchanged.push(packageJsonPath);
    }
  } else {
    if (needsUpdate) {
      writeJsonFile(packageJsonPath, updatedPkg);
      result.generated.push(packageJsonPath);
      log.log(`  Updated: ${path.relative(ROOT, packageJsonPath)}`);
    } else {
      result.unchanged.push(packageJsonPath);
      log.log('  package.json up to date');
    }
  }

  return result;
}
