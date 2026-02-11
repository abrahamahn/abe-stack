// src/tools/scripts/lint/lint-css-tokens.ts
/**
 * CSS Token Lint Script
 *
 * Scans CSS files for hardcoded values that should use --ui-* design tokens.
 *
 * Checks:
 * 1. Hardcoded colors (#hex, rgb(), rgba(), hsl(), hsla())
 * 2. Hardcoded px units (except 1px for borders/shadows)
 * 3. Hardcoded font-weight numbers (should use --ui-font-weight-*)
 *
 * Excluded:
 * - theme.css (token definitions)
 * - Lines defining --ui-* variables
 * - Values inside var() references
 * - Allowed values: 0, 0px, transparent, inherit, none, auto, currentColor
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// Configuration
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../..');
const CSS_DIR = path.join(ROOT, 'src/client/ui/src/styles');

const TARGET_FILES = ['elements.css', 'components.css', 'layouts.css', 'utilities.css'];

// Font-weight numeric values that should use tokens
const HARDCODED_FONT_WEIGHTS = new Set([
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]);

interface Violation {
  file: string;
  line: number;
  column: number;
  message: string;
  source: string;
}

// ============================================================================
// Matchers
// ============================================================================

/**
 * Check if a line is a CSS variable definition (--ui-* or --scrollbar-* etc.)
 */
function isVariableDefinition(line: string): boolean {
  return /^\s*--[\w-]+\s*:/.test(line);
}

/**
 * Check if a line is a comment
 */
function isComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//');
}

/**
 * Check if a line is an @import or @media rule (not a value)
 */
function isAtRule(line: string): boolean {
  return /^\s*@/.test(line);
}

/**
 * Strip var(...) and calc(...) expressions from a line to avoid false positives
 * on values that correctly reference tokens.
 */
function stripVarAndCalc(line: string): string {
  // Iteratively remove var(...) and calc(...) — handles nesting
  let result = line;
  let prev = '';
  while (prev !== result) {
    prev = result;
    // Remove innermost var() calls
    result = result.replace(/var\([^()]*\)/g, '');
    // Remove innermost calc() calls
    result = result.replace(/calc\([^()]*\)/g, '');
  }
  return result;
}

/**
 * Find hardcoded hex colors (#rgb, #rrggbb, #rrggbbaa)
 */
function findHexColors(line: string, lineNum: number, file: string): Violation[] {
  const violations: Violation[] = [];
  // Match #hex but not inside quotes or url()
  const stripped = stripVarAndCalc(line);
  const regex = /#[0-9a-fA-F]{3,8}\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stripped)) !== null) {
    violations.push({
      file,
      line: lineNum,
      column: match.index + 1,
      message: `Hardcoded hex color "${match[0]}" — use a --ui-color-* token instead.`,
      source: line.trim(),
    });
  }
  return violations;
}

/**
 * Find hardcoded rgb/rgba/hsl/hsla() function calls
 */
function findColorFunctions(line: string, lineNum: number, file: string): Violation[] {
  const violations: Violation[] = [];
  const stripped = stripVarAndCalc(line);
  const regex = /\b(rgba?|hsla?)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stripped)) !== null) {
    violations.push({
      file,
      line: lineNum,
      column: match.index + 1,
      message: `Hardcoded color function "${match[1]}()" — use a --ui-color-* token instead.`,
      source: line.trim(),
    });
  }
  return violations;
}

/**
 * Find hardcoded px units (except 1px for borders/shadows and 0px)
 */
function findPxUnits(line: string, lineNum: number, file: string): Violation[] {
  const violations: Violation[] = [];
  const stripped = stripVarAndCalc(line);
  // Match number followed by px, but not 0px or 1px
  const regex = /\b(\d+(?:\.\d+)?)px\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stripped)) !== null) {
    const value = match[1];
    // Allow 0px and 1px
    if (value === '0' || value === '1') continue;
    violations.push({
      file,
      line: lineNum,
      column: match.index + 1,
      message: `Hardcoded "${match[0]}" — use rem, em, %, or a --ui-* spacing token instead. (1px borders are allowed)`,
      source: line.trim(),
    });
  }
  return violations;
}

/**
 * Find hardcoded font-weight numeric values
 */
function findFontWeights(line: string, lineNum: number, file: string): Violation[] {
  const violations: Violation[] = [];
  const stripped = stripVarAndCalc(line);
  // Only check lines that contain font-weight property
  if (!/font-weight\s*:/.test(stripped)) return violations;

  const valueMatch = /font-weight\s*:\s*(\d+)/.exec(stripped);
  if (valueMatch !== null && HARDCODED_FONT_WEIGHTS.has(valueMatch[1])) {
    violations.push({
      file,
      line: lineNum,
      column: (valueMatch.index ?? 0) + 1,
      message: `Hardcoded font-weight "${valueMatch[1]}" — use a --ui-font-weight-* token instead.`,
      source: line.trim(),
    });
  }
  return violations;
}

// ============================================================================
// Main
// ============================================================================

function lintFile(filePath: string): Violation[] {
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];
  const relativePath = path.relative(ROOT, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip empty lines, comments, at-rules, and variable definitions
    if (line.trim() === '') continue;
    if (isComment(line)) continue;
    if (isAtRule(line)) continue;
    if (isVariableDefinition(line)) continue;

    violations.push(...findHexColors(line, lineNum, relativePath));
    violations.push(...findColorFunctions(line, lineNum, relativePath));
    violations.push(...findPxUnits(line, lineNum, relativePath));
    violations.push(...findFontWeights(line, lineNum, relativePath));
  }

  return violations;
}

function main(): void {
  console.log('Linting CSS files for hardcoded values...\n');

  let allViolations: Violation[] = [];

  for (const file of TARGET_FILES) {
    const filePath = path.join(CSS_DIR, file);
    const violations = lintFile(filePath);
    allViolations = [...allViolations, ...violations];
  }

  if (allViolations.length === 0) {
    console.log('No hardcoded CSS values found. All clear!');
    process.exit(0);
  }

  console.error(`Found ${allViolations.length} violation(s):\n`);

  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}:${v.column}`);
    console.error(`    ${v.message}`);
    console.error(`    > ${v.source}\n`);
  }

  process.exit(1);
}

main();
