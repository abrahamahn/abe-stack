// config/sync/sync-css-theme.ts
/**
 * Build theme.css from TypeScript theme source files
 *
 * This script generates CSS custom properties from the theme source files.
 * All values come from the source files - no hardcoded values here.
 */
import { createHash } from 'crypto';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { format } from 'prettier';
import { generateThemeCss } from '../../packages/ui/src/theme/buildThemeCss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const themeCssPath = path.resolve(__dirname, '../../packages/ui/src/styles/theme.css');
const cacheDir = path.resolve(__dirname, '../../.cache');
const themeHashPath = path.join(cacheDir, 'theme-css.hash');

const isQuiet = process.argv.includes('--quiet');
function log(message: string): void {
  if (!isQuiet) console.log(message);
}

const themeSourceFiles = [
  path.resolve(__dirname, '../../packages/ui/src/theme/colors.ts'),
  path.resolve(__dirname, '../../packages/ui/src/theme/motion.ts'),
  path.resolve(__dirname, '../../packages/ui/src/theme/radius.ts'),
  path.resolve(__dirname, '../../packages/ui/src/theme/spacing.ts'),
  path.resolve(__dirname, '../../packages/ui/src/theme/typography.ts'),
  path.resolve(__dirname, '../../packages/ui/src/theme/buildThemeCss.ts'),
];

async function computeInputHash(paths: string[]): Promise<string> {
  const hash = createHash('sha256');
  for (const filePath of paths) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    hash.update(filePath);
    hash.update(content);
  }
  return hash.digest('hex');
}

async function build(): Promise<void> {
  const inputHash = await computeInputHash(themeSourceFiles);
  await fs.promises.mkdir(cacheDir, { recursive: true });

  const existingHash = await fs.promises.readFile(themeHashPath, 'utf8').catch((): null => null);
  const hasThemeCss = await fs.promises
    .stat(themeCssPath)
    .then(() => true)
    .catch(() => false);

  if (hasThemeCss && existingHash?.trim() === inputHash) {
    log('Theme CSS is up to date; skipping rebuild.');
    return;
  }

  const css = generateThemeCss();
  const formatted = await format(css, { parser: 'css' });
  await fs.promises.writeFile(themeCssPath, formatted, 'utf8');
  await fs.promises.writeFile(themeHashPath, inputHash, 'utf8');

  log(`Generated theme CSS at ${themeCssPath}`);
}

function watch(): void {
  log('Watching theme source files...\n');

  let timeout: NodeJS.Timeout | null = null;
  const debounce = (): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      build().catch((err: unknown) => {
        console.error('Failed to build theme.css', err);
      });
    }, 100);
  };

  for (const filePath of themeSourceFiles) {
    fs.watch(filePath, () => {
      debounce();
    });
  }

  build().catch((err: unknown) => {
    console.error('Failed to build theme.css', err);
  });
}

function main(): void {
  const watchMode = process.argv.includes('--watch');
  if (watchMode) {
    watch();
    return;
  }

  build().catch((err: unknown) => {
    console.error('Failed to build theme.css', err);
    process.exitCode = 1;
  });
}

main();
