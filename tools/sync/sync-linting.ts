#!/usr/bin/env node
// tools/sync/sync-linting.ts
/**
 * Synchronizes linting-related config across package.json and VS Code.
 *
 * Usage:
 *   pnpm sync:linting          # Sync once
 *   pnpm sync:linting:check    # Check if up to date
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'config/linting.json');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const VSCODE_SETTINGS_PATH = path.join(ROOT, '.vscode/settings.json');

const isCheckOnly = process.argv.includes('--check');

function readJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type LintingConfig = {
  packageJson?: {
    scripts?: Record<string, string>;
    'lint-staged'?: Record<string, string[]>;
  };
  vscode?: {
    settings?: Record<string, unknown>;
  };
};

function syncPackageJson(config: LintingConfig, checkOnly: boolean): boolean {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) return true;

  const pkg = readJson(PACKAGE_JSON_PATH) as Record<string, unknown>;
  const desiredScripts = config.packageJson?.scripts ?? {};
  const desiredLintStaged = config.packageJson?.['lint-staged'];

  let updated = false;

  if (Object.keys(desiredScripts).length > 0) {
    const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
    for (const [key, value] of Object.entries(desiredScripts)) {
      if (scripts[key] !== value) {
        scripts[key] = value;
        updated = true;
      }
    }
    pkg.scripts = scripts;
  }

  if (desiredLintStaged) {
    const currentLintStaged = pkg['lint-staged'];
    if (!isEqual(currentLintStaged, desiredLintStaged)) {
      pkg['lint-staged'] = desiredLintStaged;
      updated = true;
    }
  }

  if (checkOnly) return !updated;

  if (updated) writeJson(PACKAGE_JSON_PATH, pkg);
  return true;
}

function syncVscodeSettings(config: LintingConfig, checkOnly: boolean): boolean {
  const desiredSettings = config.vscode?.settings ?? {};
  if (Object.keys(desiredSettings).length === 0) return true;

  const existing = fs.existsSync(VSCODE_SETTINGS_PATH)
    ? (readJson(VSCODE_SETTINGS_PATH) as Record<string, unknown>)
    : {};

  let updated = false;
  const next = { ...existing };

  for (const [key, value] of Object.entries(desiredSettings)) {
    if (!isEqual(next[key], value)) {
      next[key] = value;
      updated = true;
    }
  }

  if (checkOnly) return !updated;

  if (updated) {
    const vscodeDir = path.dirname(VSCODE_SETTINGS_PATH);
    if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });
    writeJson(VSCODE_SETTINGS_PATH, next);
  }
  return true;
}

function main(): void {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Missing config file:', CONFIG_PATH);
    process.exit(1);
  }

  const config = readJson(CONFIG_PATH) as LintingConfig;
  const okPkg = syncPackageJson(config, isCheckOnly);
  const okVscode = syncVscodeSettings(config, isCheckOnly);

  if (isCheckOnly && (!okPkg || !okVscode)) {
    console.error('Linting config is out of sync. Run "pnpm sync:linting".');
    process.exit(1);
  }

  if (!isCheckOnly) {
    console.log('✓ Linting config synced.');
  }
}

main();
