const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const outputPath = path.join(root, 'tools', 'dev', 'dev-environment.txt');

// Directories to exclude from file listing
const excludedDirs = new Set([
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

// File patterns to exclude from content extraction
const excludedFilePatterns = [
  /\.lock$/,
  /\.log$/,
  /\.map$/,
  /\.md$/, // Exclude all markdown documentation
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

// Directories where we should extract source code (now that codebase is minimal)
const srcDirs = new Set(['src', '__tests__', 'test', 'tests']);

// File extensions that are considered source code (NOW INCLUDE in src folders)
const srcCodeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

// File patterns to always include (config/setup files)
const alwaysIncludePatterns = [
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

/**
 * Check if a file should be excluded from content extraction
 */
function shouldExcludeFile(filename) {
  return excludedFilePatterns.some((pattern) => pattern.test(filename));
}

/**
 * Check if a file should always be included regardless of location
 */
function shouldAlwaysInclude(filename) {
  return alwaysIncludePatterns.some((pattern) => pattern.test(filename));
}

/**
 * Check if a file is source code in a src directory
 * (We now INCLUDE these since the codebase is minimal)
 */
function isSourceCodeInSrcDir(relPath) {
  const parts = relPath.split(path.sep);
  const ext = path.extname(relPath);

  // Check if file is in a src directory
  const inSrcDir = parts.some((part) => srcDirs.has(part));

  // Check if it's a source code file
  const isSourceCode = srcCodeExtensions.has(ext);

  return inSrcDir && isSourceCode;
}

/**
 * Check if file is a stylesheet (still exclude these)
 */
function isStylesheet(relPath) {
  const ext = path.extname(relPath);
  return ['.css', '.scss', '.sass', '.less'].includes(ext);
}

/**
 * Recursively list all files
 */
function listFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

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
}

/**
 * Categorize files by type for better organization
 */
function categorizeFiles(files) {
  const categories = {
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
}

/**
 * Determine if file content should be extracted
 */
function shouldExtractContent(relPath) {
  const filename = path.basename(relPath);

  // Skip excluded files
  if (shouldExcludeFile(filename)) {
    return false;
  }

  // Skip stylesheets (too verbose)
  if (isStylesheet(relPath)) {
    return false;
  }

  // Always include important config files
  if (shouldAlwaysInclude(filename)) {
    return true;
  }

  // NOW INCLUDE source code in src directories (minimal codebase)
  if (isSourceCodeInSrcDir(relPath)) {
    return true;
  }

  return false;
}

/**
 * Generate file tree structure
 */
function generateFileTree(files) {
  const tree = {};

  for (const file of files) {
    const parts = file.split(path.sep);
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // It's a file
        if (!current._files) current._files = [];
        current._files.push(part);
      } else {
        // It's a directory
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }

  return tree;
}

/**
 * Print tree structure
 */
function printTree(tree, indent = '', output = []) {
  const entries = Object.keys(tree).filter((k) => k !== '_files');
  const files = tree._files || [];

  // Sort directories and files
  entries.sort();
  files.sort();

  // Print directories first
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1 && files.length === 0;
    const prefix = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');

    output.push(indent + prefix + entry + '/');
    printTree(tree[entry], childIndent, output);
  }

  // Print files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isLast = i === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    output.push(indent + prefix + file);
  }

  return output;
}

/**
 * Main export function
 */
function run() {
  console.log('Generating dev environment snapshot...');

  let output = '';

  // Header
  output += '# ABE Stack - Development Environment Snapshot\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  output += '---\n\n';

  // 1. Project Structure (Tree View)
  console.log('Building project structure...');
  const allFiles = listFiles(root);
  const tree = generateFileTree(allFiles);
  const treeLines = printTree(tree);

  output += '## 1. Project Structure (Tree View)\n\n';
  output += '```\n';
  output += '.\n';
  output += treeLines.join('\n');
  output += '\n```\n\n';
  output += '---\n\n';

  // 2. Complete File Listing (Categorized)
  console.log('Categorizing files...');
  const categorized = categorizeFiles(allFiles);

  output += '## 2. Complete File Listing (Categorized)\n\n';
  output += `Total files: ${allFiles.length}\n\n`;

  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      output += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${files.length} files)\n\n`;
      output += '```\n';
      output += files.join('\n');
      output += '\n```\n\n';
    }
  }

  output += '---\n\n';

  // 3. Configuration Files Content
  console.log('Extracting configuration files...');
  const configFiles = allFiles.filter((f) => shouldExtractContent(f));

  output += '## 3. Configuration Files\n\n';
  output += `Extracted ${configFiles.length} configuration files\n\n`;
  output += '---\n\n';

  const categorizedConfigs = categorizeFiles(configFiles);

  for (const [category, files] of Object.entries(categorizedConfigs)) {
    if (files.length === 0) continue;

    output += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Configuration\n\n`;

    for (const file of files) {
      const fullPath = path.join(root, file);

      if (!fs.existsSync(fullPath)) {
        output += `#### ${file}\n\n`;
        output += '```\n(FILE NOT FOUND)\n```\n\n';
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const ext = path.extname(file).slice(1) || 'txt';

        output += `#### ${file}\n\n`;
        output += `\`\`\`${ext}\n`;
        output += content;
        if (!content.endsWith('\n')) {
          output += '\n';
        }
        output += '```\n\n';
      } catch (error) {
        output += `#### ${file}\n\n`;
        output += `\`\`\`\n(ERROR READING FILE: ${error.message})\n\`\`\`\n\n`;
      }
    }

    output += '---\n\n';
  }

  // 4. Summary Statistics
  console.log('Generating statistics...');
  const stats = {
    totalFiles: allFiles.length,
    configFiles: configFiles.length,
    srcFiles: allFiles.filter((f) => isSourceCodeInSrcDir(f)).length,
    categories: Object.entries(categorized).map(([name, files]) => ({
      name,
      count: files.length,
    })),
  };

  output += '## 4. Statistics\n\n';
  output += '```\n';
  output += `Total Files: ${stats.totalFiles}\n`;
  output += `Configuration Files Extracted: ${stats.configFiles}\n`;
  output += `Source Files (in src/): ${stats.srcFiles}\n\n`;
  output += 'Files by Category:\n';
  for (const cat of stats.categories) {
    output += `  ${cat.name}: ${cat.count}\n`;
  }
  output += '```\n\n';

  // Write output
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`\n✅ Dev environment snapshot written to ${outputPath}`);
  console.log(`   Total size: ${(output.length / 1024).toFixed(2)} KB`);
  console.log(`   Files listed: ${stats.totalFiles}`);
  console.log(`   Configs extracted: ${stats.configFiles}`);
}

// Run the export
run();
