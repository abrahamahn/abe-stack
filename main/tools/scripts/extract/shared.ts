// main/tools/scripts/extract/shared.ts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script to extract all .ts files from main/shared into a single shared.txt file.
 * ESM-compatible version with corrected paths.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script location: main/tools/scripts/extract/shared.ts
// Go up 4 levels to reach root: extract -> scripts -> tools -> main -> ROOT
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const SHARED_DIR = path.resolve(ROOT_DIR, 'main/shared');
const OUTPUT_FILE = path.join(ROOT_DIR, 'shared.txt');

function getTsFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Exclude node_modules, dist, and hidden folders
      if (file !== 'node_modules' && file !== 'dist' && !file.startsWith('.')) {
        results = results.concat(getTsFiles(filePath));
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
      results.push(filePath);
    }
  });

  return results;
}

function extractAll() {
  console.log(`Extracting .ts files from: ${SHARED_DIR}`);

  if (!fs.existsSync(SHARED_DIR)) {
    console.error(`Error: Shared directory not found at ${SHARED_DIR}`);
    process.exit(1);
  }

  const files = getTsFiles(SHARED_DIR);
  console.log(`Found ${files.length} TypeScript files.`);

  let combinedContent = '';

  files.sort().forEach((file) => {
    const relativePath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, 'utf8');

    combinedContent += `\n================================================================================\n`;
    combinedContent += `File: ${relativePath}\n`;
    combinedContent += `================================================================================\n\n`;
    combinedContent += content;
    combinedContent += `\n`;
  });

  fs.writeFileSync(OUTPUT_FILE, combinedContent, 'utf8');
  console.log(`Successfully extracted all shared code to: ${OUTPUT_FILE}`);
}

extractAll();
