// src/tools/scripts/audit/n-plus-one.ts
/**
 * N+1 Query Detection
 *
 * Static analysis to detect potential N+1 query patterns in handler code.
 * Scans for loops containing awaited repository/database calls.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const ROOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '..');
const SCAN_DIR = join(ROOT_DIR, 'src', 'server', 'core', 'src');

// Patterns that indicate a loop
const LOOP_PATTERNS = [
  /for\s*\(/,
  /\.forEach\s*\(/,
  /\.map\s*\(/,
  /for\s+await\s*\(/,
  /while\s*\(/,
];

// Patterns that indicate a DB/repo call inside an async context
const DB_CALL_PATTERNS = [
  /await\s+(?:this\.)?repos?\.\w+\.\w+/,
  /await\s+(?:this\.)?db\.\w+/,
  /await\s+ctx\.repos?\.\w+\.\w+/,
  /await\s+ctx\.db\.\w+/,
];

// ============================================================================
// Types
// ============================================================================

interface Violation {
  file: string;
  line: number;
  loopType: string;
  dbCall: string;
}

// ============================================================================
// Analysis
// ============================================================================

function collectFiles(dir: string, pattern: RegExp, results: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, pattern, results);
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function detectNPlusOne(filePath: string): Violation[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];
  const relativePath = filePath.replace(ROOT_DIR + '/', '');

  let insideLoop = false;
  let loopType = '';
  let braceDepth = 0;
  let loopBraceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Detect loop starts
    if (!insideLoop) {
      for (const pattern of LOOP_PATTERNS) {
        if (pattern.test(line)) {
          insideLoop = true;
          loopType = pattern.source.replace(/\\s\*\\\(/, '').replace(/\\/g, '');
          loopBraceStart = braceDepth;
          break;
        }
      }
    }

    // Track brace depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    // Check for DB calls inside loops
    if (insideLoop) {
      for (const pattern of DB_CALL_PATTERNS) {
        const match = pattern.exec(line);
        if (match) {
          violations.push({
            file: relativePath,
            line: i + 1,
            loopType,
            dbCall: match[0].trim(),
          });
        }
      }
    }

    // Detect loop end
    if (insideLoop && braceDepth <= loopBraceStart) {
      insideLoop = false;
    }
  }

  return violations;
}

// ============================================================================
// Report
// ============================================================================

function printReport(violations: Violation[], fileCount: number): void {
  console.log('N+1 Query Detection Audit\n');
  console.log(`Scanned ${String(fileCount)} handler files\n`);

  if (violations.length === 0) {
    console.log('PASS: No N+1 query patterns detected.');
    return;
  }

  console.log(`Found ${String(violations.length)} potential N+1 pattern(s):\n`);
  console.log('Location'.padEnd(60) + 'Loop'.padStart(15) + '  DB Call');
  console.log('-'.repeat(100));

  for (const v of violations) {
    const location = `${v.file}:${String(v.line)}`;
    console.log(location.padEnd(60) + v.loopType.padStart(15) + `  ${v.dbCall}`);
  }

  console.log(
    '\nReview these locations to determine if they are true N+1 patterns.',
  );
  console.log('Some may be intentional (batch processing) or already optimized.');
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const handlerFiles = collectFiles(SCAN_DIR, /handlers?\.ts$/);
  const serviceFiles = collectFiles(SCAN_DIR, /service\.ts$/);
  const allFiles = [...handlerFiles, ...serviceFiles];

  if (allFiles.length === 0) {
    console.error('No handler/service files found in:', SCAN_DIR);
    process.exit(1);
  }

  const violations: Violation[] = [];
  for (const file of allFiles) {
    // Skip test files
    if (file.includes('.test.')) continue;
    // Skip __tests__ directories
    if (file.includes('__tests__')) continue;

    violations.push(...detectNPlusOne(file));
  }

  printReport(violations, allFiles.length);
}

main();
