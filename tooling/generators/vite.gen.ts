// config/generators/vite.gen.ts
/**
 * Vite Configuration Generator
 *
 * The runtime aliases are now inlined in config files, so this generator is a no-op.
 */

import { createLogger } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Generate Vite alias artifacts (no-op).
 */
export function generateViteAliases(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly: _checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nVite aliases now inlined in config files - no generation needed.');

  // Runtime.ts has been removed - aliases are now inlined in each config file.
  return result;
}
