const { execSync, spawnSync } = require("child_process");
const { readdirSync, existsSync } = require("fs");
const { join, resolve, basename } = require("path");
const glob = require("glob");

// Configuration
const TEST_DIR = "."; // Starting from the project root
const TEST_PATTERN = "**/*.test.{js,ts}"; // Change this to your test file pattern

function findTestFiles() {
  try {
    // Use glob directly instead of Jest's --listTests
    const files = glob.sync(TEST_PATTERN, {
      cwd: TEST_DIR,
      absolute: true,
      ignore: ["node_modules/**"],
    });

    if (files.length === 0) {
      console.log(
        "No test files found. Check your pattern and directory settings.",
      );
    }

    return files;
  } catch (error) {
    console.error("Error finding test files:", error.message);
    return [];
  }
}

// Main function to run tests sequentially
function runTestsSequentially() {
  const testFiles = findTestFiles();

  console.log(`Found ${testFiles.length} test files to run\n`);

  let passedCount = 0;

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const fileName = basename(testFile);

    console.log(`\n[${i + 1}/${testFiles.length}] Testing: ${fileName}`);

    try {
      // Run Jest for a single file with --testMatch to ensure only this file runs
      // Using spawnSync instead of execSync for better control
      const result = spawnSync(
        "npx",
        ["jest", "--testMatch", testFile, "--no-coverage"],
        {
          stdio: "inherit",
          shell: true,
        },
      );

      if (result.status !== 0) {
        console.log(`\n❌ Failed: ${fileName}`);
        console.log("\nStopping tests due to failure");
        process.exit(1); // Exit with error code
      }

      passedCount++;
      console.log(`✅ Passed: ${fileName}`);
    } catch (error) {
      console.log(`\n❌ Failed: ${fileName}`);
      console.log("\nStopping tests due to failure");
      process.exit(1); // Exit with error code
    }
  }

  console.log(`\n✅ All ${passedCount} test files passed!`);
}

// Check if glob is installed
try {
  require.resolve("glob");
} catch (e) {
  console.log('The "glob" package is required but not installed.');
  console.log("Installing glob package...");
  try {
    execSync("npm install glob --no-save", { stdio: "inherit" });
    console.log("glob package installed successfully.");
  } catch (installError) {
    console.error("Failed to install glob package:", installError.message);
    console.log("Please run: npm install glob --save-dev");
    process.exit(1);
  }
}

// Run the tests
runTestsSequentially();
