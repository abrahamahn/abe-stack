// config/generators/prettier.gen.ts
/**
 * Prettier Configuration Generator
 *
 * Generates:
 * - config/.prettierrc
 * - config/.prettierignore
 */

import * as path from 'path';
import * as fs from 'fs';

import { prettier, prettierIgnore } from '../schema/lint';
import { createLogger, ROOT, writeJsonFile, writeTextFile } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Generate prettier configuration files
 */
export function generatePrettierConfigs(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nGenerating Prettier configs...');

  // Generate .prettierrc
  const prettierrcPath = path.join(ROOT, 'config/.prettierrc');

  if (checkOnly) {
    const existing = fs.existsSync(prettierrcPath) ? fs.readFileSync(prettierrcPath, 'utf-8') : '';
    const expected = JSON.stringify(prettier, null, 2) + '\n';
    if (existing !== expected) {
      result.generated.push(prettierrcPath);
    } else {
      result.unchanged.push(prettierrcPath);
    }
  } else {
    if (writeJsonFile(prettierrcPath, prettier)) {
      result.generated.push(prettierrcPath);
      log.log(`  Generated: ${path.relative(ROOT, prettierrcPath)}`);
    } else {
      result.unchanged.push(prettierrcPath);
    }
  }

  // Generate .prettierignore
  const prettierignorePath = path.join(ROOT, 'config/.prettierignore');
  const ignoreContent = prettierIgnore.join('\n') + '\n';

  if (checkOnly) {
    const existing = fs.existsSync(prettierignorePath)
      ? fs.readFileSync(prettierignorePath, 'utf-8')
      : '';
    if (existing !== ignoreContent) {
      result.generated.push(prettierignorePath);
    } else {
      result.unchanged.push(prettierignorePath);
    }
  } else {
    if (writeTextFile(prettierignorePath, ignoreContent)) {
      result.generated.push(prettierignorePath);
      log.log(`  Generated: ${path.relative(ROOT, prettierignorePath)}`);
    } else {
      result.unchanged.push(prettierignorePath);
    }
  }

  if (!checkOnly && result.generated.length === 0) {
    log.log('  All Prettier configs up to date');
  }

  return result;
}
