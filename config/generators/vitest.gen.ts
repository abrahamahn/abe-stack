// config/generators/vitest.gen.ts
/**
 * Vitest Configuration Generator
 *
 * The main vitest.config.ts is kept as-is since it contains runtime logic.
 * This generator ensures the app-level vitest configs are correct.
 */

import * as path from 'path';
import * as fs from 'fs';

import { createLogger, ROOT, writeTsFile } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * App vitest config templates
 */
const appConfigs: Record<string, { configName: string; content: string }> = {
  'apps/web': {
    configName: 'webConfig',
    content: `import { webConfig } from '../../config/vitest.config';

export default webConfig;
`,
  },
  'apps/server': {
    configName: 'serverConfig',
    content: `import { serverConfig } from '../../config/vitest.config';

export default serverConfig;
`,
  },
};

/**
 * Generate app-level vitest.config.ts files
 */
export function generateVitestConfigs(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nGenerating Vitest configs...');

  for (const [appPath, config] of Object.entries(appConfigs)) {
    const configPath = path.join(ROOT, appPath, 'vitest.config.ts');
    const expectedContent = `// ${appPath}/vitest.config.ts\n${config.content}`;

    if (checkOnly) {
      const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';
      if (existing !== expectedContent) {
        result.generated.push(configPath);
      } else {
        result.unchanged.push(configPath);
      }
    } else {
      const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';

      if (existing !== expectedContent) {
        fs.writeFileSync(configPath, expectedContent);
        result.generated.push(configPath);
        log.log(`  Generated: ${path.relative(ROOT, configPath)}`);
      } else {
        result.unchanged.push(configPath);
      }
    }
  }

  if (!checkOnly && result.generated.length === 0) {
    log.log('  All Vitest configs up to date');
  }

  return result;
}
