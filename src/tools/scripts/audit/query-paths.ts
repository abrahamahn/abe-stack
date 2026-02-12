// src/tools/scripts/audit/query-paths.ts
/**
 * Query Path Analysis
 *
 * Parses critical handler files and counts repository method calls per function.
 * Flags any handler function that makes more than 5 repo calls.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

const MAX_QUERIES_PER_HANDLER = 5;
const ROOT_DIR = resolve(import.meta.dirname, '..', '..', '..', '..');
const CORE_DIR = join(ROOT_DIR, 'src', 'server', 'core', 'src');

const CRITICAL_FILES = [
  'auth/handlers/login.ts',
  'auth/oauth/refresh.ts',
  'auth/handlers/totp.ts',
  'tenants/service.ts',
];

// ============================================================================
// Types
// ============================================================================

interface HandlerAnalysis {
  file: string;
  functions: FunctionAnalysis[];
}

interface FunctionAnalysis {
  name: string;
  line: number;
  repoCalls: string[];
  totalQueries: number;
  overLimit: boolean;
}

// ============================================================================
// Analysis
// ============================================================================

/** Match repo/db method calls: repos.X.Y, ctx.repos.X.Y, db.X */
const REPO_CALL_REGEX = /(?:repos?|db)\.(\w+)\.(\w+)|(?:repos?|db)\.(\w+)\(/g;

function analyzeFile(filePath: string, relativeName: string): HandlerAnalysis | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const functions: FunctionAnalysis[] = [];

  let currentFn: { name: string; line: number; repoCalls: string[] } | null = null;
  let braceDepth = 0;
  let fnBraceStart = 0;

  // Pattern to detect function declarations
  const fnPatterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
    /(\w+)\s*:\s*(?:async\s+)?\(/,
    /(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Detect function start
    if (currentFn === null) {
      for (const pattern of fnPatterns) {
        const match = pattern.exec(line);
        if (match?.[1]) {
          currentFn = { name: match[1], line: i + 1, repoCalls: [] };
          fnBraceStart = braceDepth;
          break;
        }
      }
    }

    // Track brace depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    // Collect repo calls inside functions
    if (currentFn !== null) {
      let repoMatch: RegExpExecArray | null = null;
      REPO_CALL_REGEX.lastIndex = 0;
      while ((repoMatch = REPO_CALL_REGEX.exec(line)) !== null) {
        const call =
          repoMatch[1] && repoMatch[2]
            ? `${repoMatch[1]}.${repoMatch[2]}`
            : (repoMatch[3] ?? 'unknown');
        currentFn.repoCalls.push(call);
      }
    }

    // Detect function end
    if (currentFn !== null && braceDepth <= fnBraceStart && i > currentFn.line) {
      if (currentFn.repoCalls.length > 0) {
        functions.push({
          name: currentFn.name,
          line: currentFn.line,
          repoCalls: currentFn.repoCalls,
          totalQueries: currentFn.repoCalls.length,
          overLimit: currentFn.repoCalls.length > MAX_QUERIES_PER_HANDLER,
        });
      }
      currentFn = null;
    }
  }

  // Flush remaining function
  if (currentFn !== null && currentFn.repoCalls.length > 0) {
    functions.push({
      name: currentFn.name,
      line: currentFn.line,
      repoCalls: currentFn.repoCalls,
      totalQueries: currentFn.repoCalls.length,
      overLimit: currentFn.repoCalls.length > MAX_QUERIES_PER_HANDLER,
    });
  }

  return { file: relativeName, functions };
}

// ============================================================================
// Report
// ============================================================================

function printReport(analyses: HandlerAnalysis[]): boolean {
  console.log('Query Path Analysis\n');
  console.log(`Threshold: ${String(MAX_QUERIES_PER_HANDLER)} repo calls per handler\n`);

  let hasViolation = false;

  for (const analysis of analyses) {
    console.log(`\n--- ${analysis.file} ---`);

    if (analysis.functions.length === 0) {
      console.log('  (no repo calls detected)');
      continue;
    }

    for (const fn of analysis.functions) {
      const flag = fn.overLimit ? ' [OVER LIMIT]' : '';
      if (fn.overLimit) hasViolation = true;

      console.log(
        `  ${fn.name}() (line ${String(fn.line)}): ${String(fn.totalQueries)} queries${flag}`,
      );
      for (const call of fn.repoCalls) {
        console.log(`    - ${call}`);
      }
    }
  }

  console.log('\n' + '-'.repeat(60));
  const totalFns = analyses.reduce((sum, a) => sum + a.functions.length, 0);
  const overLimitFns = analyses.reduce(
    (sum, a) => sum + a.functions.filter((f) => f.overLimit).length,
    0,
  );
  console.log(`Total functions analyzed: ${String(totalFns)}`);
  console.log(`Over limit: ${String(overLimitFns)}`);

  return hasViolation;
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const analyses: HandlerAnalysis[] = [];

  for (const relPath of CRITICAL_FILES) {
    const fullPath = join(CORE_DIR, relPath);
    const analysis = analyzeFile(fullPath, relPath);
    if (analysis !== null) {
      analyses.push(analysis);
    } else {
      console.warn(`File not found: ${relPath}`);
    }
  }

  if (analyses.length === 0) {
    console.error('No critical files could be analyzed.');
    process.exit(1);
  }

  const hasViolation = printReport(analyses);

  if (hasViolation) {
    console.warn('\nWARN: Some handlers exceed the query limit. Consider optimizing.');
  } else {
    console.log('\nPASS: All handlers within query limit.');
  }
}

main();
