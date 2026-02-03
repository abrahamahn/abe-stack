// tools/scripts/export/export-config.ts
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

  // infra (consolidated)
  'infra/package.json',
  'infra/tsconfig.json',
  'infra/vitest.config.ts',

  // infra/contracts
  'infra/contracts/package.json',
  'infra/contracts/tsconfig.json',
  'infra/contracts/vitest.config.ts',

  // kernel
  'kernel/package.json',
  'kernel/tsconfig.json',
  'kernel/vitest.config.ts',

  // premium/media
  'premium/media/package.json',
  'premium/media/tsconfig.json',
  'premium/media/vitest.config.ts',

  // premium/websocket
  'premium/websocket/package.json',
  'premium/websocket/tsconfig.json',
  'premium/websocket/vitest.config.ts',

  // premium/client/engine
  'premium/client/engine/package.json',
  'premium/client/engine/tsconfig.json',
  'premium/client/engine/vitest.config.ts',

  // client
  'client/package.json',
  'client/tsconfig.json',
  'client/vitest.config.ts',

  // client/react
  'client/react/package.json',
  'client/react/tsconfig.json',
  'client/react/vitest.config.ts',

  // client/ui
  'client/ui/package.json',
  'client/ui/tsconfig.json',
  'client/ui/vitest.config.ts',
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
