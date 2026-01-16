// tools/export/export-ui-code.ts
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface ExportOptions {
  includePaths: string[]; // Specific paths to export (empty = default behavior)
  includeTests: boolean; // Include __tests__ directories
  autoIncludeCorrespondingTests: boolean; // When exporting a file, also export its test
}

/**
 * Export UI code to ui_code.txt
 *
 * Usage:
 *   tsx tools/dev/export-ui-code.ts                          # Export all (no tests)
 *   tsx tools/dev/export-ui-code.ts --include-tests          # Export all with tests
 *   tsx tools/dev/export-ui-code.ts --path packages/ui/src/elements/Button.tsx
 *   tsx tools/dev/export-ui-code.ts --path packages/ui/src/elements --with-tests
 */
async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..', '..'); // Go up two levels: tools/dev -> tools -> root

  // Parse command line arguments
  const options = parseArgs(process.argv.slice(2));

  const outputFile = path.resolve(repoRoot, 'ui_code.txt');
  const files: string[] = [];

  if (options.includePaths.length > 0) {
    // Export specific paths
    for (const relativePath of options.includePaths) {
      const fullPath = path.resolve(repoRoot, relativePath);
      await collectFilesFromPath(fullPath, files, options, repoRoot);

      // Auto-include corresponding tests if requested
      if (options.autoIncludeCorrespondingTests) {
        const testPath = findCorrespondingTest(fullPath);
        if (testPath) {
          try {
            await fs.access(testPath);
            await collectFilesFromPath(testPath, files, options, repoRoot);
          } catch {
            // Test file doesn't exist, skip
          }
        }
      }
    }
  } else {
    // Default behavior: export packages/ui and apps/web/src/features/demo
    const uiDir = path.resolve(repoRoot, 'packages', 'ui');
    const demoDir = path.resolve(repoRoot, 'apps', 'web', 'src', 'features', 'demo');
    await collectFiles(uiDir, files, options);
    await collectFiles(demoDir, files, options);
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

  process.stdout.write(`✅ UI code exported to ${outputFile}\n`);
  process.stdout.write(`   ${String(files.length)} files, ${sizeKB}KB, ${lineCountStr} lines\n`);
  if (options.includeTests) {
    process.stdout.write(`   (includes tests)\n`);
  }
}

function parseArgs(args: string[]): ExportOptions {
  const options: ExportOptions = {
    includePaths: [],
    includeTests: false,
    autoIncludeCorrespondingTests: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

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
      // Treat as path if no flag
      options.includePaths.push(arg);
    }
  }

  return options;
}

async function collectFilesFromPath(
  fullPath: string,
  out: string[],
  options: ExportOptions,
  _repoRoot: string,
): Promise<void> {
  const stat = await fs.stat(fullPath);

  if (stat.isFile()) {
    // Single file
    out.push(fullPath);
  } else if (stat.isDirectory()) {
    // Directory
    await collectFiles(fullPath, out, options);
  }
}

function findCorrespondingTest(filePath: string): string | null {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);

  // Check __tests__ directory (preferred location)
  const testInDir = path.join(dir, '__tests__', `${base}.test${ext}`);

  return testInDir;
}

async function collectFiles(dir: string, out: string[], options: ExportOptions): Promise<void> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // Skip missing optional directories (e.g., demo absent)
    return;
  }

  for (const entry of entries) {
    // Skip __tests__ unless includeTests is true
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
  console.error('Failed to export UI code:', err);
  process.exitCode = 1;
});
