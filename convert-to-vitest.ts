#!/usr/bin/env ts-node

/**
 * Script to help convert Jest test files to Vitest
 *
 * Usage:
 *   npx ts-node convert-to-vitest.ts [options] [directory]
 *
 * Options:
 *   --dry-run    Shows what would be changed without making changes
 *   --help       Shows this help message
 *
 * If no directory is provided, it will use the current directory
 *
 * Examples:
 *   npx ts-node convert-to-vitest.ts --dry-run
 *   npx ts-node convert-to-vitest.ts src/tests
 *   npx ts-node convert-to-vitest.ts
 */

import * as fs from "fs";
import * as path from "path";

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const showHelp = args.includes("--help");
let targetDir = ".";

// Show help if requested
if (showHelp) {
  console.log(`
Convert Jest test files to Vitest

Usage: 
  npx ts-node convert-to-vitest.ts [options] [directory]

Options:
  --dry-run    Shows what would be changed without making changes
  --help       Shows this help message

If no directory is provided, it will use the current directory

Examples:
  npx ts-node convert-to-vitest.ts --dry-run
  npx ts-node convert-to-vitest.ts src/tests
  npx ts-node convert-to-vitest.ts
`);
  process.exit(0);
}

// Find the directory argument (the one that's not a flag)
for (const arg of args) {
  if (!arg.startsWith("--")) {
    targetDir = arg;
    break;
  }
}

console.log(
  `Mode: ${dryRun ? "Dry run (no changes will be made)" : "Converting files"}`,
);

// Check if directory exists
if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}

// Function to find all test files recursively
function findTestFiles(directory: string): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and .git directories
          if (item === "node_modules" || item === ".git" || item === "dist") {
            continue;
          }
          // Recursively search subdirectories
          files.push(...findTestFiles(fullPath));
        } else if (
          stat.isFile() &&
          (item.endsWith(".test.ts") || item.endsWith(".spec.ts"))
        ) {
          files.push(fullPath);
        }
      } catch (error) {
        console.error(
          `Error accessing ${fullPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Error reading directory ${directory}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return files;
}

// Function to fix common TypeScript lint issues
function fixCommonLintIssues(content: string): string {
  const fixedContent = content
    // Fix parameter type issues in mock implementations
    .replace(
      /mockImplementation\(\(([^,)]+)(?:,\s*([^)]+))?\)\s*=>/g,
      (_, param1, param2) => {
        if (param2) {
          return `mockImplementation((${param1}: any, ${param2}: any) =>`;
        }
        return `mockImplementation((${param1}: any) =>`;
      },
    )
    // Fix rest parameter implicit any types
    .replace(
      /mockImplementation\(\(\.\.\.(args)\)\s*=>/g,
      "mockImplementation((...$1: any[]) =>",
    )
    // Fix issues with null values in Record<string, string>
    .replace(/NULL_SECRET: null/g, "NULL_SECRET: null as unknown as string")
    // Fix issues with other types in Record<string, string>
    .replace(/(\w+?)_SECRET: (\d+) as any/g, "$1_SECRET: String($2) as any")
    .replace(
      /(\w+?)_SECRET: (true|false) as any/g,
      "$1_SECRET: String($2) as any",
    )
    // Fix private property references from extending base classes
    .replace(/return this\.logger;/g, "return this.logger as any;")
    // Fix private loaded property
    .replace(/private loaded = false/g, "private _loaded = false")
    .replace(/return this\.loaded/g, "return this._loaded")
    .replace(/this\.loaded =/g, "this._loaded =");

  return fixedContent;
}

// Function to convert a single file
function convertFile(filePath: string): boolean {
  console.log(`Processing: ${filePath}`);

  try {
    // Read the file
    let content = fs.readFileSync(filePath, "utf8");

    // Skip if already converted (imports from vitest)
    if (content.includes('from "vitest"')) {
      console.log(`  Skipping - already converted`);
      return false;
    }

    // Make a copy of original content to check if changes were made
    const originalContent = content;

    // Add vitest imports if they don't exist
    if (!content.includes("import { describe, it, expect")) {
      // Check if there are any imports at the top of the file
      const importRegex = /^import/m;

      if (importRegex.test(content)) {
        // Add after the last import statement
        const lastImportIndex = content.lastIndexOf("import");
        const endOfImportLine = content.indexOf("\n", lastImportIndex);

        content =
          content.slice(0, endOfImportLine + 1) +
          'import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";\n' +
          content.slice(endOfImportLine + 1);
      } else {
        // Add to the top of the file
        content =
          'import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";\n\n' +
          content;
      }
    }

    // Replace Jest specific syntax with Vitest equivalents
    interface Replacement {
      from: RegExp;
      to: string;
    }

    const replacements: Replacement[] = [
      // Replace mocking
      { from: /jest\.mock/g, to: "vi.mock" },
      { from: /jest\.fn/g, to: "vi.fn" },
      { from: /jest\.spyOn/g, to: "vi.spyOn" },
      { from: /jest\.resetAllMocks/g, to: "vi.resetAllMocks" },
      { from: /jest\.resetModules/g, to: "vi.resetModules" },
      { from: /jest\.restoreAllMocks/g, to: "vi.restoreAllMocks" },
      { from: /jest\.clearAllMocks/g, to: "vi.clearAllMocks" },
      { from: /jest\.requireActual/g, to: "vi.importActual" },
      { from: /jest\.useFakeTimers/g, to: "vi.useFakeTimers" },
      { from: /jest\.runAllTimers/g, to: "vi.runAllTimers" },
      { from: /jest\.advanceTimersByTime/g, to: "vi.advanceTimersByTime" },
      { from: /jest\.useRealTimers/g, to: "vi.useRealTimers" },
      { from: /jest\.setTimeout/g, to: "vi.setConfig({ testTimeout:" },
      // Replace expect extensions
      { from: /expect\.extend/g, to: "expect.extend" },
      {
        from: /expect\.addSnapshotSerializer/g,
        to: "expect.addSnapshotSerializer",
      },
      // Replace types
      { from: /jest\.Mocked<(.+?)>/g, to: "any" },
      { from: /jest\.MockedClass<(.+?)>/g, to: "any" },
      { from: /jest\.MockedFunction<(.+?)>/g, to: "any" },
      { from: /jest\.Mock<(.+?)>/g, to: "any" },
      { from: /as jest\.Mocked<(.+?)>/g, to: "as any" },
      {
        from: /const (.+?) = (.+?) as jest\.MockedClass<(.+?)>/g,
        to: "const $1 = vi.mocked($2)",
      },
      // Fix setSecret to private method issue
      {
        from: /this\.setSecret\((.+?), (.+?)\);/g,
        to: "(this as any).secrets = { ...((this as any).secrets || {}), $1: $2 };",
      },
    ];

    // Apply all replacements
    replacements.forEach(({ from, to }) => {
      content = content.replace(from, to);
    });

    // Fix common lint issues
    content = fixCommonLintIssues(content);

    // Check if any changes were made
    if (content === originalContent) {
      console.log(`  No changes needed`);
      return false;
    }

    // Write the modified content back to the file (unless in dry run mode)
    if (!dryRun) {
      fs.writeFileSync(filePath, content);
      console.log(`  Converted to Vitest syntax`);
    } else {
      console.log(`  Would convert to Vitest syntax (dry run)`);
    }

    return true;
  } catch (error) {
    console.error(
      `  Error processing ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

// Main execution
console.log(`Finding test files in: ${targetDir}`);
const testFiles = findTestFiles(targetDir);
console.log(`Found ${testFiles.length} test files`);

let converted = 0;
let skipped = 0;
let errors = 0;

testFiles.forEach((file) => {
  try {
    const didConvert = convertFile(file);
    if (didConvert) {
      converted++;
    } else {
      skipped++;
    }
  } catch (error) {
    console.error(
      `Error converting ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
    errors++;
  }
});

console.log("\n========== Conversion Summary ==========");
console.log(`Total files found: ${testFiles.length}`);
console.log(
  `Files ${dryRun ? "that would be converted" : "converted"}: ${converted}`,
);
console.log(
  `Files skipped (already converted or no changes needed): ${skipped}`,
);
console.log(`Files with errors: ${errors}`);
console.log("========================================");

if (dryRun) {
  console.log("\nThis was a dry run. No files were modified.");
  console.log("Run without the --dry-run flag to apply changes.");
}

if (converted > 0) {
  console.log("\nPost-conversion steps:");
  console.log("1. Review converted files for any remaining Jest-specific code");
  console.log("2. Fix any TypeScript errors that might still exist");
  console.log("3. Run the tests to ensure they work with Vitest");
  console.log("4. Update package.json scripts to use Vitest instead of Jest");
}

console.log(
  "\nNote: You may need to manually review and fix any complex mocking patterns that weren't automatically converted.",
);
