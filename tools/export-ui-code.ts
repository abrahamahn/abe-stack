import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Emit a single file at the repo root: ui_code.txt
 * Concatenates UI source files (packages/ui/src and apps/web/src/demo) with file headers.
 */
async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..');
  const uiDir = path.resolve(repoRoot, 'packages', 'ui', 'src');
  const demoDir = path.resolve(repoRoot, 'apps', 'web', 'src', 'demo');
  const outputFile = path.resolve(repoRoot, 'ui_code.txt');

  const files: string[] = [];
  await collectFiles(uiDir, files);
  await collectFiles(demoDir, files);
  files.sort((a, b) => a.localeCompare(b));

  const parts: string[] = [];
  for (const filePath of files) {
    const rel = path.relative(repoRoot, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    parts.push(`// FILE: ${rel}\n${content}\n`);
  }

  await fs.writeFile(outputFile, parts.join('\n'), 'utf8');
  process.stdout.write(`UI code exported to ${outputFile}\n`);
}

async function collectFiles(dir: string, out: string[]): Promise<void> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // Skip missing optional directories (e.g., demo absent)
    return;
  }

  for (const entry of entries) {
    if (entry.name === '__tests__') continue;
    if (entry.name === 'dist') continue;
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
}

main().catch((err: unknown) => {
  console.error('Failed to export UI code:', err);
  process.exitCode = 1;
});
