#!/usr/bin/env node
// tools/scripts/path/shared.ts

/**
 * @file shared.ts
 * @description Exports all files in @abe-stack/shared package to .tmp/PATH-shared.md
 * This serves as the Source of Truth list for the shared package.
 * @module tools/scripts/path/shared
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const SHARED_ROOT = path.join(REPO_ROOT, 'shared/src');

/**
 * Recursively walks a directory and collects all files
 * @param dir - Directory to walk
 * @param files - Accumulator for found files
 * @returns Array of relative file paths
 */
function walkDir(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(REPO_ROOT, fullPath);

    if (entry.isDirectory()) {
      // Direct exclude for build artifacts and node_modules
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
        walkDir(fullPath, files);
      }
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Exports shared package files to PATH-shared.md
 */
function exportSharedFiles(): void {
  console.log('🔄 Scanning @abe-stack/shared package...');

  if (!fs.existsSync(SHARED_ROOT)) {
    console.error(`❌ Error: ${SHARED_ROOT} does not exist.`);
    console.log('Ensure you are running this from the repository root or correct path.');
    process.exit(1);
  }

  const allFiles = walkDir(SHARED_ROOT);
  allFiles.sort();

  // Group by subdirectory in src/ (config, constants, errors, types, schemas, utils)
  const groups = new Map<string, string[]>();

  for (const file of allFiles) {
    const parts = file.split(path.sep);
    // Pattern: shared/src/<category>/...
    // parts[0]: shared
    // parts[1]: src
    // parts[2]: <category> (e.g. config, utils, or filename if in src root)

    const cat = parts[2] && !parts[2].includes('.') ? parts[2] : 'Root';

    const existing = groups.get(cat) ?? [];
    existing.push(file);
    groups.set(cat, existing);
  }

  const categories = ['config', 'constants', 'errors', 'types', 'schemas', 'utils', 'Root'];
  let output = '# @abe-stack/shared Package Files\n';
  output += '\n> This package is the single source of truth for environment-agnostic code.\n';
  output += '> All files below are located in `shared/src/`.\n';

  let count = 0;

  // Output categorized sections
  for (const cat of categories) {
    const files = groups.get(cat);
    if (files && files.length > 0) {
      output += `\n## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
      for (const file of files.sort()) {
        output += `- [ ] ${file}\n`;
        count++;
      }
      groups.delete(cat);
    }
  }

  // Output any remaining groups (unexpected subdirectories)
  const remainingKeys = Array.from(groups.keys()).sort();
  for (const key of remainingKeys) {
    const files = groups.get(key);
    if (files && files.length > 0) {
      output += `\n## ${key.charAt(0).toUpperCase() + key.slice(1)}\n`;
      for (const file of files.sort()) {
        output += `- [ ] ${file}\n`;
        count++;
      }
    }
  }

  // Ensure .tmp directory exists
  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'PATH-shared.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Success: Exported ${count} shared files to ${outputPath}`);
  console.log(`📄 Use "cat .tmp/PATH-shared.md" to see the list.`);
}

// Execute
exportSharedFiles();
