// config/generators/vscode.gen.ts
/**
 * VS Code Settings Generator
 *
 * Generates:
 * - .vscode/settings.json
 */

import * as path from 'path';
import * as fs from 'fs';

import { vscodeAdditionalSettings, vscodeSettings } from '../schema/lint';
import { createLogger, readJsonFile, ROOT, writeJsonFile } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Generate VS Code settings
 */
export function generateVscodeSettings(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nGenerating VS Code settings...');

  const settingsPath = path.join(ROOT, '.vscode/settings.json');

  // Merge schema settings with additional settings
  const expectedSettings = {
    ...vscodeAdditionalSettings,
    ...vscodeSettings,
  };

  // Read existing settings to preserve any user additions
  const existingSettings = readJsonFile<Record<string, unknown>>(settingsPath) ?? {};

  // Check if the schema-defined keys match
  let needsUpdate = false;
  const mergedSettings = { ...existingSettings };

  for (const [key, value] of Object.entries(expectedSettings)) {
    if (JSON.stringify(existingSettings[key]) !== JSON.stringify(value)) {
      needsUpdate = true;
      mergedSettings[key] = value;
    }
  }

  if (checkOnly) {
    if (needsUpdate) {
      result.generated.push(settingsPath);
    } else {
      result.unchanged.push(settingsPath);
    }
  } else {
    if (needsUpdate) {
      // Ensure .vscode directory exists
      const vscodeDir = path.dirname(settingsPath);
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      writeJsonFile(settingsPath, mergedSettings);
      result.generated.push(settingsPath);
      log.log(`  Generated: ${path.relative(ROOT, settingsPath)}`);
    } else {
      result.unchanged.push(settingsPath);
      log.log('  VS Code settings up to date');
    }
  }

  return result;
}
