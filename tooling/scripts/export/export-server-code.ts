// tools/export/export-server-code.ts
/**
 * Export Server Code
 *
 * Exports all source code from apps/server/src/* (excluding test files)
 * into a single file for code review or AI context.
 *
 * Run with: npx tsx tools/dev/export-server-code.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const serverSrcPath = path.join(root, 'apps', 'server', 'src');
const outputPath = path.join(root, 'server_code.txt');

const excludedDirs = new Set<string>(['node_modules', '.git', 'dist', '__tests__']);

const excludedFilePatterns: RegExp[] = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
  /\.map$/,
];

const sourceExtensions = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const shouldExcludeFile = (filename: string): boolean =>
  excludedFilePatterns.some((pattern) => pattern.test(filename));

const isSourceFile = (filename: string): boolean => {
  const ext = path.extname(filename);
  return sourceExtensions.has(ext);
};

const listFiles = (dir: string, base = ''): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludedDirs.has(entry.name)) continue;

    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(full, rel));
    } else if (isSourceFile(entry.name) && !shouldExcludeFile(entry.name)) {
      files.push(rel);
    }
  }

  return files;
};

const run = (): void => {
  log('Exporting server source code...');

  if (!fs.existsSync(serverSrcPath)) {
    log(`Error: Server source path not found: ${serverSrcPath}`);
    process.exit(1);
  }

  const files = listFiles(serverSrcPath);
  files.sort();

  let output = '';

  output += '# ABE Stack - Server Source Code Export\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Source: apps/server/src/\n`;
  output += `Files: ${String(files.length)}\n\n`;
  output += '---\n\n';

  output += '## File List\n\n';
  output += '```\n';
  output += files.map((f) => `apps/server/src/${f}`).join('\n');
  output += '\n```\n\n';
  output += '---\n\n';

  output += '## Source Code\n\n';

  for (const file of files) {
    const fullPath = path.join(serverSrcPath, file);
    const relativePath = `apps/server/src/${file}`;

    output += `### ${relativePath}\n\n`;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const ext = path.extname(file).slice(1) || 'txt';
      output += `\`\`\`${ext}\n`;
      output += content;
      if (!content.endsWith('\n')) {
        output += '\n';
      }
      output += '```\n\n';
    } catch (error) {
      output += '```\n';
      output += `(ERROR READING FILE: ${(error as Error).message})\n`;
      output += '```\n\n';
    }
  }

  output += '---\n\n';
  output += '## Statistics\n\n';
  output += '```\n';
  output += `Total source files: ${String(files.length)}\n`;
  output += `Output size: ${(output.length / 1024).toFixed(2)} KB\n`;
  output += '```\n';

  fs.writeFileSync(outputPath, output, 'utf8');

  log(`\n✅ Server code exported to ${outputPath}`);
  log(`   Files exported: ${String(files.length)}`);
  log(`   Output size: ${(output.length / 1024).toFixed(2)} KB`);
};

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  run();
}
