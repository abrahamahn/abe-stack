#!/usr/bin/env node
// config/generators/index.ts
/**
 * Centralized Config Generator - Main Entry Point
 *
 * Usage:
 *   pnpm config:generate          # Generate all configs
 *   pnpm config:generate --check  # Check if configs are up to date
 *   pnpm config:generate --watch  # Watch mode for development
 *   pnpm config:generate --only=tsconfig  # Generate specific config type
 */

import * as fs from 'fs';
import * as path from 'path';

import { generatePackageJson } from './package.gen';
import { generatePrettierConfigs } from './prettier.gen';
import { generateTsconfigs } from './tsconfig.gen';
import { generateViteAliases } from './vite.gen';
import { generateVscodeSettings } from './vscode.gen';

const ROOT = path.resolve(__dirname, '../..');

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

type GeneratorType = 'tsconfig' | 'vite' | 'prettier' | 'vscode' | 'package';

const generators: Record<
  GeneratorType,
  (opts: { checkOnly?: boolean; quiet?: boolean }) => GeneratorResult
> = {
  tsconfig: generateTsconfigs,
  vite: generateViteAliases,
  prettier: generatePrettierConfigs,
  vscode: generateVscodeSettings,
  package: generatePackageJson,
};

function parseArgs(): {
  checkOnly: boolean;
  quiet: boolean;
  watch: boolean;
  only: GeneratorType | null;
} {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const quiet = args.includes('--quiet');
  const watch = args.includes('--watch');

  let only: GeneratorType | null = null;
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  if (onlyArg) {
    const value = onlyArg.split('=')[1] as GeneratorType;
    if (value && value in generators) {
      only = value;
    }
  }

  return { checkOnly, quiet, watch, only };
}

function runGenerators(options: {
  checkOnly: boolean;
  quiet: boolean;
  only: GeneratorType | null;
}): GeneratorResult {
  const { checkOnly, quiet, only } = options;

  const allResults: GeneratorResult = {
    generated: [],
    unchanged: [],
    errors: [],
  };

  const generatorsToRun = only ? { [only]: generators[only] } : generators;

  for (const [name, generator] of Object.entries(generatorsToRun)) {
    try {
      const result = generator({ checkOnly, quiet });
      allResults.generated.push(...result.generated);
      allResults.unchanged.push(...result.unchanged);
      allResults.errors.push(...result.errors);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      allResults.errors.push(`${name}: ${message}`);
      if (!quiet) {
        console.error(`\nError in ${name} generator:`, message);
      }
    }
  }

  return allResults;
}

function printSummary(results: GeneratorResult, checkOnly: boolean): void {
  console.log('\n' + '='.repeat(50));

  if (checkOnly) {
    if (results.generated.length > 0) {
      console.log(`\n${String(results.generated.length)} file(s) need to be regenerated:`);
      for (const file of results.generated) {
        console.log(`  - ${file}`);
      }
      console.log('\nRun "pnpm config:generate" to update them.');
    } else {
      console.log('\n All configs are up to date.');
    }
  } else {
    if (results.generated.length > 0) {
      console.log(`\n${String(results.generated.length)} file(s) generated/updated`);
    }
    if (results.unchanged.length > 0) {
      console.log(`${String(results.unchanged.length)} file(s) unchanged`);
    }
  }

  if (results.errors.length > 0) {
    console.error(`\n${String(results.errors.length)} error(s):`);
    for (const error of results.errors) {
      console.error(`  - ${error}`);
    }
  }
}

/**
 * Watch mode - watches for changes and regenerates configs
 */
function watchMode(quiet: boolean): void {
  // Directories to watch for new folders (alias auto-discovery)
  const srcDirs = [
    'apps/web/src',
    'apps/server/src',
    'apps/desktop/src',
    'packages/core/src',
    'packages/sdk/src',
    'packages/ui/src',
  ];

  // Also watch schema directory for manual changes
  const schemaDir = 'config/schema';

  let debounceTimer: NodeJS.Timeout | null = null;
  const watchedDirs = new Set<string>();

  const regenerate = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      if (!quiet) {
        console.log('\n[config:generate] Change detected, regenerating...');
      }
      const results = runGenerators({ checkOnly: false, quiet: true, only: null });
      if (!quiet && results.generated.length > 0) {
        console.log(`[config:generate] Updated ${String(results.generated.length)} file(s)`);
      }
    }, 1000);
  };

  const watchDirectory = (dirPath: string): void => {
    const fullPath = path.join(ROOT, dirPath);
    if (!fs.existsSync(fullPath)) return;
    if (watchedDirs.has(fullPath)) return;

    watchedDirs.add(fullPath);

    try {
      const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        // Only trigger on directory changes or TypeScript files
        const ext = path.extname(filename);
        if (eventType === 'rename' || ext === '.ts' || ext === '.tsx') {
          regenerate();
        }
      });

      watcher.on('error', () => {
        // Silently ignore watch errors
      });
    } catch {
      // Silently ignore if watch fails
    }
  };

  // Initial generation
  if (!quiet) {
    console.log('Generating configs...');
    console.log('='.repeat(50));
  }
  const results = runGenerators({ checkOnly: false, quiet, only: null });
  if (!quiet) {
    printSummary(results, false);
  }

  // Start watching
  for (const dir of srcDirs) {
    watchDirectory(dir);
  }
  watchDirectory(schemaDir);

  if (!quiet) {
    console.log(`\n[config:generate] Watching ${String(watchedDirs.size)} directories...`);
  }

  // Keep process alive
  process.on('SIGINT', () => {
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    process.exit(0);
  });
}

function main(): void {
  const { checkOnly, quiet, watch, only } = parseArgs();

  if (watch) {
    watchMode(quiet);
    return;
  }

  if (!quiet) {
    console.log(checkOnly ? '\nChecking configs...' : '\nGenerating configs...');
    console.log('='.repeat(50));
  }

  const results = runGenerators({ checkOnly, quiet, only });

  if (!quiet) {
    printSummary(results, checkOnly);
  }

  if (checkOnly && results.generated.length > 0) {
    process.exit(1);
  }

  if (results.errors.length > 0) {
    process.exit(1);
  }
}

main();
