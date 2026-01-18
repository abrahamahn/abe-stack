#!/usr/bin/env node
// config/generators/index.ts
/**
 * Centralized Config Generator - Main Entry Point
 *
 * Usage:
 *   pnpm config:generate          # Generate all configs
 *   pnpm config:generate --check  # Check if configs are up to date
 *   pnpm config:generate --only=tsconfig  # Generate specific config type
 */

import { generatePackageJson } from './package.gen';
import { generatePrettierConfigs } from './prettier.gen';
import { generateTsconfigs } from './tsconfig.gen';
import { generateViteAliases } from './vite.gen';
import { generateVitestConfigs } from './vitest.gen';
import { generateVscodeSettings } from './vscode.gen';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

type GeneratorType = 'tsconfig' | 'vite' | 'vitest' | 'prettier' | 'vscode' | 'package';

const generators: Record<
  GeneratorType,
  (opts: { checkOnly?: boolean; quiet?: boolean }) => GeneratorResult
> = {
  tsconfig: generateTsconfigs,
  vite: generateViteAliases,
  vitest: generateVitestConfigs,
  prettier: generatePrettierConfigs,
  vscode: generateVscodeSettings,
  package: generatePackageJson,
};

function parseArgs(): { checkOnly: boolean; quiet: boolean; only: GeneratorType | null } {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const quiet = args.includes('--quiet');

  let only: GeneratorType | null = null;
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  if (onlyArg) {
    const value = onlyArg.split('=')[1] as GeneratorType;
    if (value && value in generators) {
      only = value;
    }
  }

  return { checkOnly, quiet, only };
}

function main(): void {
  const { checkOnly, quiet, only } = parseArgs();

  console.log(checkOnly ? '\nChecking configs...' : '\nGenerating configs...');
  console.log('='.repeat(50));

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
      console.error(`\nError in ${name} generator:`, message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));

  if (checkOnly) {
    if (allResults.generated.length > 0) {
      console.log(`\n${String(allResults.generated.length)} file(s) need to be regenerated:`);
      for (const file of allResults.generated) {
        console.log(`  - ${file}`);
      }
      console.log('\nRun "pnpm config:generate" to update them.');
      process.exit(1);
    } else {
      console.log('\n All configs are up to date.');
    }
  } else {
    if (allResults.generated.length > 0) {
      console.log(`\n${String(allResults.generated.length)} file(s) generated/updated`);
    }
    if (allResults.unchanged.length > 0) {
      console.log(`${String(allResults.unchanged.length)} file(s) unchanged`);
    }
  }

  if (allResults.errors.length > 0) {
    console.error(`\n${String(allResults.errors.length)} error(s):`);
    for (const error of allResults.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}

main();
