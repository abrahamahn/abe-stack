// config/generators/package.gen.ts
/**
 * Package.json Generator
 *
 * Note: This generator was previously used to sync lint-staged config.
 * That functionality was removed when we switched to manual git hooks.
 * Keeping this file for potential future package.json automation needs.
 */

import * as path from 'path';

import { createLogger, ROOT } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Package.json generator - currently a no-op
 * Kept for future automation needs
 */
export function generatePackageJson(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nPackage.json: No automated updates configured');

  const packageJsonPath = path.join(ROOT, 'package.json');
  result.unchanged.push(packageJsonPath);

  return result;
}
