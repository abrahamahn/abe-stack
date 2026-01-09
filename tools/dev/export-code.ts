// tools/dev/export-code.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..'); // Go up two levels: tools/dev -> tools -> root
const outputPath = path.join(root, 'full_code.txt');

const excludedDirs = new Set<string>([
  'node_modules',
  '.git',
  '.turbo',
  '.next',
  '.cache',
  'dist',
  'build',
  'coverage',
  'out',
  '.expo',
  'android',
  'ios',
  '.gradle',
  'xcuserdata',
]);

const excludedFilePatterns: RegExp[] = [
  /\.lock$/,
  /\.log$/,
  /\.map$/,
  /\.md$/,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
  /^\.gitignore$/,
  /^\.npmrc$/,
  /^\.dockerignore$/,
  /^Dockerfile$/,
  /^\.env\.local$/,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
];

const srcCodeExtensions = new Set<string>(['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml']);

const alwaysIncludePatterns: RegExp[] = [
  /package\.json$/,
  /tsconfig.*\.json$/,
  /\.config\.(ts|js|mjs|cjs)$/,
  /turbo\.json$/,
  /pnpm-workspace\.yaml$/,
  /\.prettierrc$/,
  /\.prettierignore$/,
  /\.eslintrc.*$/,
  /eslint\.config\.(ts|js)$/,
  /vite\.config\.(ts|js)$/,
  /vitest\.config\.(ts|js)$/,
  /jest\.config\.(ts|js)$/,
  /playwright\.config\.(ts|js)$/,
  /\.env\.example$/,
  /\.env\.development$/,
  /\.env\.production$/,
  /drizzle\.config\.(ts|js)$/,
  /\.editorconfig$/,
  /\.nvmrc$/,
  /babel\.config\.(ts|js)$/,
  /metro\.config\.(ts|js)$/,
  /app\.json$/,
];

type Categories = {
  root: string[];
  apps: string[];
  packages: string[];
  config: string[];
  tools: string[];
  docs: string[];
  other: string[];
};

type FileTree = {
  _files?: string[];
  [key: string]: FileTree | string[] | undefined;
};

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const shouldExcludeFile = (filename: string): boolean =>
  excludedFilePatterns.some((pattern) => pattern.test(filename));

const shouldAlwaysInclude = (filename: string): boolean =>
  alwaysIncludePatterns.some((pattern) => pattern.test(filename));

const isSourceCode = (relPath: string): boolean => {
  const ext = path.extname(relPath);
  return srcCodeExtensions.has(ext);
};

const isStylesheet = (relPath: string): boolean => {
  const ext = path.extname(relPath);
  return ['.css', '.scss', '.sass', '.less'].includes(ext);
};

const listFiles = (dir: string, base = ''): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludedDirs.has(entry.name)) continue;

    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(full, rel));
    } else {
      files.push(rel);
    }
  }

  return files;
};

const categorizeFiles = (files: string[]): Categories => {
  const categories: Categories = {
    root: [],
    apps: [],
    packages: [],
    config: [],
    tools: [],
    docs: [],
    other: [],
  };

  for (const file of files) {
    if (file.startsWith('apps' + path.sep)) {
      categories.apps.push(file);
    } else if (file.startsWith('packages' + path.sep)) {
      categories.packages.push(file);
    } else if (file.startsWith('config' + path.sep)) {
      categories.config.push(file);
    } else if (file.startsWith('tools' + path.sep)) {
      categories.tools.push(file);
    } else if (file.startsWith('docs' + path.sep)) {
      categories.docs.push(file);
    } else if (!file.includes(path.sep)) {
      categories.root.push(file);
    } else {
      categories.other.push(file);
    }
  }

  return categories;
};

const shouldExtractContent = (relPath: string): boolean => {
  const filename = path.basename(relPath);

  if (shouldExcludeFile(filename)) return false;
  if (isStylesheet(relPath)) return false;
  if (shouldAlwaysInclude(filename)) return true;
  if (isSourceCode(relPath)) return true;

  return false;
};

const generateFileTree = (files: string[]): FileTree => {
  const tree: FileTree = {};

  for (const file of files) {
    const parts = file.split(path.sep);
    let current: FileTree = tree;

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (!current._files) current._files = [];
        current._files.push(part);
      } else {
        if (!current[part]) current[part] = {};
        current = current[part] as FileTree;
      }
    }
  }

  return tree;
};

const printTree = (tree: FileTree, indent = '', output: string[] = []): string[] => {
  const entries = Object.keys(tree).filter((key) => key !== '_files');
  const files = tree._files ?? [];

  entries.sort();
  files.sort();

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1 && files.length === 0;
    const prefix = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');

    output.push(indent + prefix + entry + '/');
    printTree(tree[entry] as FileTree, childIndent, output);
  });

  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    output.push(indent + prefix + file);
  });

  return output;
};

const run = (): void => {
  log('Generating code snapshot...');

  let output = '';

  output += '# ABE Stack - Code Snapshot\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  output += '---\n\n';

  log('Building project structure...');
  const allFiles = listFiles(root);
  const tree = generateFileTree(allFiles);
  const treeLines = printTree(tree);

  output += '## 1. Project Structure (Tree View)\n\n';
  output += '```\n';
  output += '.\n';
  output += treeLines.join('\n');
  output += '\n```\n\n';
  output += '---\n\n';

  log('Categorizing files...');
  const categorized = categorizeFiles(allFiles);

  output += '## 2. Complete File Listing (Categorized)\n\n';
  output += `Total files: ${String(allFiles.length)}\n\n`;

  for (const [category, files] of Object.entries(categorized)) {
    if (files.length === 0) continue;
    output += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${String(files.length)} files)\n\n`;
    output += '```\n';
    output += files.join('\n');
    output += '\n```\n\n';
  }

  output += '---\n\n';

  log('Extracting code files...');
  const configFiles = allFiles.filter((file) => shouldExtractContent(file));

  output += '## 3. Code Files\n\n';
  output += `Extracted ${String(configFiles.length)} code files\n\n`;
  output += '---\n\n';

  const categorizedConfigs = categorizeFiles(configFiles);

  for (const [category, files] of Object.entries(categorizedConfigs)) {
    if (files.length === 0) continue;

    output += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const file of files) {
      const fullPath = path.join(root, file);

      output += `#### ${file}\n\n`;

      if (!fs.existsSync(fullPath)) {
        output += '```\n(FILE NOT FOUND)\n```\n\n';
        continue;
      }

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
  }

  log('Generating statistics...');
  const stats = {
    totalFiles: allFiles.length,
    configFiles: configFiles.length,
    srcFiles: allFiles.filter((file) => isSourceCode(file)).length,
    categories: Object.entries(categorized).map(([name, files]) => ({
      name,
      count: files.length,
    })),
  };

  output += '## 4. Statistics\n\n';
  output += '```\n';
  output += `Total Files: ${String(stats.totalFiles)}\n`;
  output += `Code Files Extracted: ${String(stats.configFiles)}\n`;
  output += `Source Code Files: ${String(stats.srcFiles)}\n\n`;
  output += 'Files by Category:\n';
  for (const category of stats.categories) {
    output += `  ${category.name}: ${String(category.count)}\n`;
  }
  output += '```\n\n';

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');

  log(`\n✅ Code snapshot written to ${outputPath}`);
  log(`   Total size: ${(output.length / 1024).toFixed(2)} KB`);
  log(`   Files listed: ${String(stats.totalFiles)}`);
  log(`   Code files extracted: ${String(stats.configFiles)}`);
};

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  run();
}
