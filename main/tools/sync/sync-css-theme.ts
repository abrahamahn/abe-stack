// main/tools/sync/sync-css-theme.ts
/**
 * Build theme.css from TypeScript theme source files
 *
 * This script generates CSS custom properties from the theme source files.
 * All values come from the source files - no hardcoded values here.
 */
import { createHash } from 'crypto';
import { promises as fsPromises, watch as fsWatch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'url';

import { format } from 'prettier';
import { generateThemeCss } from '../../client/ui/src/theme/buildThemeCss';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themeCssPath = resolve(__dirname, '../../client/ui/src/styles/theme.css');
const cacheDir = resolve(__dirname, '../../node_modules/.cache');
const themeHashPath = join(cacheDir, 'theme-css.hash');

const isQuiet = process.argv.includes('--quiet');
function log(message: string): void {
  if (!isQuiet) console.log(message);
}

const themeSourceFiles = [
  resolve(__dirname, '../../client/ui/src/theme/colors.ts'),
  resolve(__dirname, '../../client/ui/src/theme/motion.ts'),
  resolve(__dirname, '../../client/ui/src/theme/radius.ts'),
  resolve(__dirname, '../../client/ui/src/theme/spacing.ts'),
  resolve(__dirname, '../../client/ui/src/theme/typography.ts'),
  resolve(__dirname, '../../client/ui/src/theme/buildThemeCss.ts'),
];

async function computeInputHash(paths: string[]): Promise<string> {
  const hash = createHash('sha256');
  for (const filePath of paths) {
    const content = await fsPromises.readFile(filePath, 'utf8');
    hash.update(filePath);
    hash.update(content);
  }
  return hash.digest('hex');
}

async function build(): Promise<void> {
  const inputHash = await computeInputHash(themeSourceFiles);
  await fsPromises.mkdir(cacheDir, { recursive: true });

  const existingHash = await fsPromises.readFile(themeHashPath, 'utf8').catch((): null => null);
  // Use readFile instead of stat to avoid TOCTOU race condition
  const existingCss = await fsPromises
    .readFile(themeCssPath, 'utf8')
    .then(() => true)
    .catch(() => false);

  if (existingCss && existingHash?.trim() === inputHash) {
    log('Theme CSS is up to date; skipping rebuild.');
    return;
  }

  const css = generateThemeCss();
  const formatted = await format(css, { parser: 'css' });
  await fsPromises.writeFile(themeCssPath, formatted, 'utf8');
  await fsPromises.writeFile(themeHashPath, inputHash, 'utf8');

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
    fsWatch(filePath, () => {
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
