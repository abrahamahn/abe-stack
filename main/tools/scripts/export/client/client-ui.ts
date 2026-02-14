// main/tools/scripts/export/client/client-ui.ts
/**
 * Client UI Package Exporter
 *
 * Exports all source code from main/client/ui into a single file
 * for code review or AI context.
 *
 * @usage
 *   pnpm tsx main/tools/scripts/export/client/client-ui.ts                     # Export all (no tests)
 *   pnpm tsx main/tools/scripts/export/client/client-ui.ts --include-tests     # Export all with tests
 *   pnpm tsx main/tools/scripts/export/client/client-ui.ts --path main/client/ui/src/elements/Button.tsx
 *   pnpm tsx main/tools/scripts/export/client/client-ui.ts --path main/client/ui/src/elements --with-tests
 */
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface ExportOptions {
  includePaths: string[];
  includeTests: boolean;
  autoIncludeCorrespondingTests: boolean;
}

/**
 * Exports client/ui source code to .tmp/client-ui.txt.
 * When --path is provided, exports only the specified files/directories.
 * Otherwise exports the entire main/client/ui package.
 */
async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

  const options = parseArgs(process.argv.slice(2));

  const outputDir = path.resolve(repoRoot, '.tmp');
  await fs.mkdir(outputDir, { recursive: true });
  const outputFile = path.resolve(outputDir, 'client-ui.txt');
  const files: string[] = [];

  if (options.includePaths.length > 0) {
    for (const relativePath of options.includePaths) {
      const fullPath = path.resolve(repoRoot, relativePath);
      await collectFilesFromPath(fullPath, files, options);

      if (options.autoIncludeCorrespondingTests) {
        const testPath = findCorrespondingTest(fullPath);
        if (testPath) {
          try {
            await fs.access(testPath);
            await collectFilesFromPath(testPath, files, options);
          } catch {
            // Test file doesn't exist, skip
          }
        }
      }
    }
  } else {
    // Default: export only main/client/ui
    const uiDir = path.resolve(repoRoot, 'src', 'client', 'ui');
    await collectFiles(uiDir, files, options);
  }

  files.sort((a, b) => a.localeCompare(b));

  const parts: string[] = [];
  for (const filePath of files) {
    const rel = path.relative(repoRoot, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    parts.push(`// FILE: ${rel}\n${content}\n`);
  }

  await fs.writeFile(outputFile, parts.join('\n'), 'utf8');

  const stats = await fs.stat(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const lineCount = parts.join('\n').split('\n').length;
  const lineCountStr = lineCount.toLocaleString();

  process.stdout.write(`✅ Client UI code exported to ${outputFile}\n`);
  process.stdout.write(`   ${String(files.length)} files, ${sizeKB}KB, ${lineCountStr} lines\n`);
  if (options.includeTests) {
    process.stdout.write(`   (includes tests)\n`);
  }
}

/**
 * Parses CLI arguments into export options.
 * @param args - Raw CLI arguments
 * @returns Parsed export options
 */
function parseArgs(args: string[]): ExportOptions {
  const options: ExportOptions = {
    includePaths: [],
    includeTests: false,
    autoIncludeCorrespondingTests: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;

    if (arg === '--include-tests') {
      options.includeTests = true;
    } else if (arg === '--with-tests') {
      options.autoIncludeCorrespondingTests = true;
    } else if (arg === '--path') {
      const nextArg = args[++i];
      if (!nextArg) {
        throw new Error('--path requires a value');
      }
      options.includePaths.push(nextArg);
    } else if (!arg.startsWith('--')) {
      options.includePaths.push(arg);
    }
  }

  return options;
}

/**
 * Collects files from a path (file or directory).
 * @param fullPath - Absolute path to file or directory
 * @param out - Array to push collected file paths into
 * @param options - Export options controlling test inclusion
 */
async function collectFilesFromPath(
  fullPath: string,
  out: string[],
  options: ExportOptions,
): Promise<void> {
  const stat = await fs.stat(fullPath);

  if (stat.isFile()) {
    out.push(fullPath);
  } else if (stat.isDirectory()) {
    await collectFiles(fullPath, out, options);
  }
}

/**
 * Finds the corresponding test file for a source file.
 * @param filePath - Absolute path to the source file
 * @returns Path to the test file, or null if not determinable
 */
function findCorrespondingTest(filePath: string): string | null {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);

  return path.join(dir, '__tests__', `${base}.test${ext}`);
}

/**
 * Recursively collects source files from a directory.
 * @param dir - Absolute directory path to scan
 * @param out - Array to push collected file paths into
 * @param options - Export options controlling test inclusion
 * @complexity O(n) where n is total filesystem entries
 */
async function collectFiles(dir: string, out: string[], options: ExportOptions): Promise<void> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '__tests__' && !options.includeTests) continue;
    if (entry.name === 'dist') continue;
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, out, options);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
}

main().catch((err: unknown) => {
  console.error('Failed to export client UI code:', err);
  process.exitCode = 1;
});
