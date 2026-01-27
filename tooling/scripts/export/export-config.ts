// tooling/scripts/export/export-config.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const FILES_TO_EXPORT = [
  // Root-level environment files
  '.env',
  '.env.development',
  '.env.development.example',
  '.env.local',
  '.env.local.example',
  '.env.production',
  '.env.production.example',
  '.env.test',
  '.env.test.example',

  // Root-level config files
  '.editorconfig',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
  'eslint.config.ts',
  'package.json',
  'playwright.config.ts',
  'pnpm-workspace.yaml',
  'README.md',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.react.json',
  'turbo.json',
  'vitest.base.ts',
  'vitest.config.ts',
  'vitest.workspace.ts',

  // apps/desktop
  'apps/desktop/package.json',
  'apps/desktop/tsconfig.json',
  'apps/desktop/vite.config.ts',
  'apps/desktop/vitest.config.ts',

  // apps/server
  'apps/server/package.json',
  'apps/server/tsconfig.json',
  'apps/server/vitest.config.ts',

  // packages/contracts
  'packages/contracts/package.json',
  'packages/contracts/tsconfig.json',
  'packages/contracts/vitest.config.ts',

  // packages/core
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'packages/core/vitest.config.ts',

  // packages/db
  'packages/db/package.json',
  'packages/db/tsconfig.json',
  'packages/db/vitest.config.ts',

  // packages/media
  'packages/media/package.json',
  'packages/media/tsconfig.json',
  'packages/media/vitest.config.ts',

  // packages/sdk
  'packages/sdk/package.json',
  'packages/sdk/tsconfig.json',
  'packages/sdk/vitest.config.ts',

  // packages/stores
  'packages/stores/package.json',
  'packages/stores/tsconfig.json',
  'packages/stores/vitest.config.ts',

  // packages/ui
  'packages/ui/package.json',
  'packages/ui/tsconfig.json',
  'packages/ui/vitest.config.ts',
];

function exportConfig() {
  console.log('🚀 Exporting monorepo configurations to config.txt...');

  let output = '';
  let count = 0;

  for (const relativePath of FILES_TO_EXPORT) {
    const fullPath = path.join(REPO_ROOT, relativePath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      output += `\n\n================================================================================\n`;
      output += `FILE: ${relativePath}\n`;
      output += `================================================================================\n\n`;
      output += content;
      output += `\n`;
      count++;
    } else {
      console.warn(`⚠️  Skip: ${relativePath} (File not found)`);
    }
  }

  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'config.txt');
  fs.writeFileSync(outputPath, output.trim());

  console.log(`\n✅ Successfully exported ${count} files to ${outputPath}`);
}

exportConfig();
