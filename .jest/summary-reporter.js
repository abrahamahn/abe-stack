/**
 * Enhanced Jest reporter that provides clean, comprehensive test results
 * with clear error details and actionable insights
 */
class SummaryReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
    this._suitesTotal = 0;
    this._suitesCompleted = 0;
    this._testsTotal = 0;
    this._testsCompleted = 0;
    this._testsPassed = 0;
    this._testsFailed = 0;
    this._testsPending = 0;
    this._lastFilePath = "";
    this._isBail = globalConfig.bail !== 0 && globalConfig.bail !== false;
    this._failedTests = [];
    this._resultsByFile = new Map();
    this._startTime = null;
    this._executionTime = 0;
  }

  onRunStart(results) {
    this._startTime = Date.now();
    this._suitesTotal = results.numTotalTestSuites;

    // Header with clean styling
    console.log("\n" + this._getBox("▶ JEST TEST RUN", "cyan", true));

    // If in bail mode, inform the user
    if (this._isBail) {
      console.log(
        this._getColoredText(
          "yellow",
          `⚠ Running in bail mode - will stop on first failure (bail=${this._globalConfig.bail})`,
        ),
      );
      console.log("");
    }
  }

  onTestResult(test, testResult) {
    this._suitesCompleted++;
    const testCounts = testResult.testResults.length;
    this._testsCompleted += testCounts;
    this._testsPassed += testResult.numPassingTests;
    this._testsFailed += testResult.numFailingTests;
    this._testsPending += testResult.numPendingTests;
    this._testsTotal = this._testsCompleted;
    this._lastFilePath = test.path;

    // Track failed tests with detailed information for later reporting
    if (testResult.numFailingTests > 0) {
      const failedResults = testResult.testResults.filter(
        (result) => result.status === "failed",
      );

      this._failedTests.push({
        path: test.path,
        failures: testResult.numFailingTests,
        failedResults: failedResults,
      });
    }

    // Get simplified file path for display
    const testFile = test.path.split("\\").pop() || test.path.split("/").pop();

    // Store results by file for the custom output
    const fileResults = {
      name: testFile,
      path: test.path,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      pending: testResult.numPendingTests,
      results: testResult.testResults,
      duration: testResult.perfStats.end - testResult.perfStats.start,
    };
    this._resultsByFile.set(test.path, fileResults);

    // Only display detailed output when there's a failure or in verbose mode
    if (testResult.numFailingTests > 0 || this._globalConfig.verbose) {
      // Display a compact summary of the file's test results
      console.log("\n"); // Add empty line for readability

      // Show file header with pass/fail status and execution time
      const executionTime = (
        (testResult.perfStats.end - testResult.perfStats.start) /
        1000
      ).toFixed(2);
      const fileStatus =
        testResult.numFailingTests > 0
          ? `${this._getColoredText("red", "x")} ${this._getColoredText("bright", testFile)} ${this._getColoredText("cyan", `(${executionTime}s)`)}: ${this._getColoredText("green", testResult.numPassingTests + " passed")}, ${this._getColoredText("red", testResult.numFailingTests + " failed")}`
          : `${this._getColoredText("green", "✓")} ${this._getColoredText("bright", testFile)} ${this._getColoredText("cyan", `(${executionTime}s)`)}: ${this._getColoredText("green", testResult.numPassingTests + " passed")}, ${this._getColoredText("red", "0 failed")}`;

      console.log(
        `${this._getBox(`FILE: ${fileStatus}`, testResult.numFailingTests > 0 ? "red" : "green")}`,
      );

      // For each test, show a simplified result with clear pass/fail indicators
      let currentDescribe = "";
      let indentLevel = 0;

      testResult.testResults.forEach((result) => {
        // Only show failing tests unless in verbose mode
        if (result.status !== "failed" && !this._globalConfig.verbose) {
          return;
        }

        // Extract the describe block if it exists
        const testTitleParts = result.ancestorTitles.concat(result.title);

        // Handle describe blocks with better styling
        if (
          result.ancestorTitles.length > 0 &&
          result.ancestorTitles[0] !== currentDescribe
        ) {
          currentDescribe = result.ancestorTitles[0];
          // Use bright white for better visibility of test suite names
          console.log(
            `  ${this._getColoredText("bright", `📋 ${currentDescribe}`)}`,
          );
          indentLevel = 1;
        }

        // For nested describes
        for (let i = 1; i < result.ancestorTitles.length; i++) {
          // Style nested describe blocks
          console.log(
            `${"  ".repeat(i + 1)}${this._getColoredText("bright", `• ${result.ancestorTitles[i]}`)}`,
          );
          indentLevel = i + 1;
        }

        // Format status indicators
        const statusSymbol =
          result.status === "passed"
            ? this._getColoredText("green", "✓")
            : result.status === "failed"
              ? this._getColoredText("red", "x")
              : this._getColoredText("yellow", "○");

        // Print the test result with appropriate indentation
        const indent = "  ".repeat(indentLevel + 1);

        // Duration info for test
        const testDuration = result.duration
          ? ` ${this._getColoredText("cyan", `(${result.duration}ms)`)}`
          : "";

        // Color the entire line red for failing tests, keep test name default for passing tests
        if (result.status === "failed") {
          console.log(
            `${indent}${this._getColoredText("red", `x ${result.title}`)}${testDuration}`,
          );
        } else {
          console.log(
            `${indent}${statusSymbol} ${result.title}${testDuration}`,
          );
        }

        // For failing tests, extract and show error information with improved formatting
        if (
          result.status === "failed" &&
          result.failureMessages &&
          result.failureMessages.length > 0
        ) {
          const errorIndent = "  ".repeat(indentLevel + 2);
          const message = result.failureMessages[0]; // Just use the first message

          // Parse the error message
          let parts = {
            errorLine: "",
            expected: "",
            received: "",
            filePath: "",
            lineInfo: "",
            suggestion: "",
          };

          // Find error message - first line of the error
          const errorLines = message.split("\n");
          if (errorLines.length > 0) {
            const errorFirstLine = errorLines.find((line) =>
              line.trim().startsWith("Error:"),
            );
            if (errorFirstLine) {
              parts.errorLine = errorFirstLine.trim();
            }
          }

          // Find expected/received values (for specific matchers like toBe)
          const expectedMatch = message.match(/Expected:([^\n]*)/);
          const receivedMatch = message.match(/Received:([^\n]*)/);

          if (expectedMatch) parts.expected = expectedMatch[1].trim();
          if (receivedMatch) parts.received = receivedMatch[1].trim();

          // Find file and line information
          const fileMatch = message.match(/\((.+?):(\d+):(\d+)\)/);
          if (fileMatch) {
            parts.filePath = fileMatch[1];
            parts.lineInfo = `${fileMatch[2]}:${fileMatch[3]}`;

            // Convert absolute path to relative path starting with src
            const srcIndex = parts.filePath.indexOf("\\src\\");
            if (srcIndex !== -1) {
              parts.filePath =
                "src" +
                parts.filePath.substring(srcIndex + 4).replace(/\\/g, "/");
            } else {
              // If src not found, just try to get the last portions of the path
              const pathParts = parts.filePath.split("\\");
              if (pathParts.length > 3) {
                const srcPartIndex = pathParts.findIndex(
                  (part) => part === "src",
                );
                if (srcPartIndex !== -1) {
                  parts.filePath = pathParts.slice(srcPartIndex).join("/");
                }
              }
            }
          }

          // Show organized error info in a box format
          console.log(`${errorIndent}${this._getBox("ERROR DETAILS", "red")}`);
          console.log(
            `${errorIndent}  ${this._getColoredText("red", `Message:`)} ${parts.errorLine.replace(/^Error:\s*/, "")}`,
          );

          // Only show Expected/Received if they exist in the error message
          if (parts.expected) {
            // Check if it's an object and try to format it better
            try {
              if (
                parts.expected.includes("{") ||
                parts.expected.includes("[")
              ) {
                const parsedExpected = JSON.parse(
                  parts.expected.replace(/'/g, '"'),
                );
                console.log(
                  `${errorIndent}  ${this._getColoredText("green", "Expected:")}\n${errorIndent}    ${JSON.stringify(parsedExpected, null, 2).replace(/\n/g, `\n${errorIndent}    `)}`,
                );
              } else {
                console.log(
                  `${errorIndent}  ${this._getColoredText("green", "Expected:")} ${parts.expected}`,
                );
              }
            } catch (e) {
              console.log(
                `${errorIndent}  ${this._getColoredText("green", "Expected:")} ${parts.expected}`,
              );
            }
          }

          if (parts.received) {
            // Check if it's an object and try to format it better
            try {
              if (
                parts.received.includes("{") ||
                parts.received.includes("[")
              ) {
                const parsedReceived = JSON.parse(
                  parts.received.replace(/'/g, '"'),
                );
                console.log(
                  `${errorIndent}  ${this._getColoredText("red", "Received:")}\n${errorIndent}    ${JSON.stringify(parsedReceived, null, 2).replace(/\n/g, `\n${errorIndent}    `)}`,
                );
              } else {
                console.log(
                  `${errorIndent}  ${this._getColoredText("red", "Received:")} ${parts.received}`,
                );
              }
            } catch (e) {
              console.log(
                `${errorIndent}  ${this._getColoredText("red", "Received:")} ${parts.received}`,
              );
            }
          }

          if (parts.filePath) {
            console.log(
              `${errorIndent}  ${this._getColoredText("cyan", "Location:")} ${parts.filePath}:${parts.lineInfo}`,
            );
          }

          // Try to extract code context from the message with improved display
          let codeContext = "";
          const codeLines = message.split("\n");

          // For errors like toHaveBeenCalled, toBeNaN, etc.
          // Try to extract the actual test code
          if (parts.errorLine && parts.errorLine.includes("expect(")) {
            // Remove 'Error: ' prefix if it exists
            codeContext = parts.errorLine.replace(/^Error:\s*/, "");
          } else {
            // Extract code context with line numbers
            let contextLines = [];
            let foundPointer = false;

            for (let i = 0; i < codeLines.length; i++) {
              const line = codeLines[i];
              // Look for code lines with a pointer
              if (line.includes(">") && line.includes("|")) {
                foundPointer = true;
                // Get the line with > pointer and surrounding lines
                const match = line.match(/>\s+(\d+)\s*\|\s*(.*)/);
                if (match && match[2]) {
                  const lineNum = match[1];
                  contextLines.push({
                    number: lineNum,
                    code: match[2],
                    highlighted: true,
                  });

                  // Get up to 2 lines before and after for context
                  for (let j = i - 2; j < i; j++) {
                    if (j >= 0) {
                      const beforeMatch =
                        codeLines[j].match(/\s+(\d+)\s*\|\s*(.*)/);
                      if (beforeMatch && beforeMatch[2]) {
                        contextLines.unshift({
                          number: beforeMatch[1],
                          code: beforeMatch[2],
                          highlighted: false,
                        });
                      }
                    }
                  }

                  for (let j = i + 1; j < i + 3 && j < codeLines.length; j++) {
                    const afterMatch =
                      codeLines[j].match(/\s+(\d+)\s*\|\s*(.*)/);
                    if (afterMatch && afterMatch[2]) {
                      contextLines.push({
                        number: afterMatch[1],
                        code: afterMatch[2],
                        highlighted: false,
                      });
                    }
                  }

                  break;
                }
              }
            }

            // If we found code with line numbers
            if (contextLines.length > 0) {
              console.log(
                `${errorIndent}  ${this._getColoredText("bright", "Code Context:")}`,
              );

              // Display code context with line numbers
              contextLines.forEach((line) => {
                const linePrefix = line.highlighted ? "▶" : " ";
                const lineStyle = line.highlighted ? "bright" : "default";
                const lineNumber = this._getColoredText(
                  "cyan",
                  `${line.number.padStart(3, " ")}`,
                );
                const lineCode = line.highlighted
                  ? this._getColoredText("bright", line.code)
                  : line.code;

                console.log(
                  `${errorIndent}  ${linePrefix} ${lineNumber} | ${lineCode}`,
                );
              });
            } else if (!foundPointer) {
              // For errors without line pointers, try to extract just the code
              for (let i = 0; i < codeLines.length; i++) {
                if (codeLines[i].includes(">") && codeLines[i].includes("|")) {
                  // Found a line with code context marker
                  const match = codeLines[i].match(/>\s+\d+\s*\|\s*(.*)/);
                  if (match && match[1]) {
                    codeContext = match[1].trim();
                    break;
                  }
                }
              }

              // If we found code context, display it
              if (codeContext && codeContext.trim() !== "") {
                console.log(
                  `${errorIndent}  ${this._getColoredText("bright", "Code:")} ${codeContext}`,
                );
              }
            }
          }

          // Generate a helpful suggestion based on the error type
          parts.suggestion = this._generateSuggestion(message, parts);
          if (parts.suggestion) {
            console.log(
              `${errorIndent}  ${this._getColoredText("yellow", "Suggestion:")} ${parts.suggestion}`,
            );
          }

          console.log(`${errorIndent}${this._getBox("", "red", false, true)}`);
          console.log(""); // Add a blank line after error details
        }
      });

      // Add file summary
      const summary =
        `  ${this._getColoredText("green", `${testResult.numPassingTests} passed`)}` +
        (testResult.numFailingTests > 0
          ? `, ${this._getColoredText("red", `${testResult.numFailingTests} failed`)}`
          : "") +
        (testResult.numPendingTests > 0
          ? `, ${this._getColoredText("yellow", `${testResult.numPendingTests} pending`)}`
          : "");

      console.log(`\n  Summary: ${summary}`);

      // If test has failures and we're in bail mode, show a clear message
      if (testResult.numFailingTests > 0 && this._isBail) {
        console.log(
          this._getColoredText(
            "red",
            "⚠ Test failures detected - stopping due to bail flag",
          ),
        );
      }

      // Add progress indicator for all test files
      const progressPercent = Math.round(
        (this._suitesCompleted / this._suitesTotal) * 100,
      );
      const progressBar = this._generateProgressBar(progressPercent);
      console.log(
        `${progressBar} ${this._getColoredText("cyan", `Progress: ${progressPercent}%`)} (${this._suitesCompleted}/${this._suitesTotal} files)`,
      );

      console.log(""); // Add another empty line for better readability
    } else {
      // For passing tests, just show a simple line with spinners to show activity
      const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      const spinner = spinners[this._suitesCompleted % spinners.length];
      const executionTime = (
        (testResult.perfStats.end - testResult.perfStats.start) /
        1000
      ).toFixed(2);
      const progressStatus = `${spinner} [${this._suitesCompleted}/${this._suitesTotal}] ${this._getColoredText("green", "✓")} ${testFile} ${this._getColoredText("cyan", `(${executionTime}s)`)}`;
      process.stdout.write(`${progressStatus}\r`);

      // If this is the last test file, add a newline to prevent overwriting
      if (this._suitesCompleted === this._suitesTotal) {
        console.log("");
      }
    }
  }

  onRunComplete(contexts, results) {
    this._executionTime = (Date.now() - this._startTime) / 1000;

    // Results table by file with improved formatting
    console.log(
      "\n" +
        this._getBox(
          "📊 TEST SUMMARY (" + this._executionTime.toFixed(2) + "s)",
          "cyan",
          true,
        ),
    );

    // Calculate the number of failed suites but 0 tests
    const suiteErrorCount = Array.from(this._resultsByFile.values()).filter(
      (file) => file.passed === 0 && file.failed === 0,
    ).length;

    console.log("\nResults by file:");
    Array.from(this._resultsByFile.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((fileResult) => {
        const executionTime = (fileResult.duration / 1000).toFixed(2);
        const status =
          fileResult.failed > 0
            ? this._getColoredText("red", "x")
            : fileResult.passed === 0 && fileResult.failed === 0
              ? this._getColoredText("yellow", "⚠")
              : this._getColoredText("green", "✓");

        const fileStatus = `${status} ${fileResult.name} (${executionTime}s): ${fileResult.passed} passed, ${fileResult.failed} failed`;

        // Add a warning indicator for files with 0 tests executed
        const statusLine =
          fileResult.passed === 0 && fileResult.failed === 0
            ? `${fileStatus} ${this._getColoredText("yellow", "- No tests executed, possible setup error")}`
            : fileStatus;

        console.log(`  ${statusLine}`);
      });

    const {
      numFailedTestSuites,
      numPassedTestSuites,
      numPendingTestSuites,
      numRuntimeErrorTestSuites,
      numTotalTestSuites,
      numTotalTests,
      numPassedTests,
      numFailedTests,
      numPendingTests,
      snapshot,
    } = results;

    // Test suites summary with improved styling
    console.log(
      `\n${this._getColoredText("bright", "Test Suites:")}: ${this._getColoredText(numFailedTestSuites > 0 ? "red" : "green", numFailedTestSuites > 0 ? "FAILED" : "PASSED")}`,
    );
    console.log(`  Total:     ${numTotalTestSuites}`);
    console.log(
      `  Passed:    ${this._getColoredText("green", numPassedTestSuites)}`,
    );
    console.log(
      `  Failed:    ${this._getColoredText("red", numFailedTestSuites)}`,
    );
    // Add new line to show suite errors
    if (suiteErrorCount > 0) {
      console.log(
        `  Setup Errors: ${this._getColoredText("yellow", suiteErrorCount)}`,
      );
    }

    // Test cases summary with improved styling
    console.log(
      `\n${this._getColoredText("bright", "Tests:")}: ${this._getColoredText(numFailedTests > 0 ? "red" : "green", numFailedTests > 0 ? "FAILED" : "PASSED")}`,
    );
    console.log(`  Total:     ${numTotalTests}`);
    console.log(
      `  Passed:    ${this._getColoredText("green", numPassedTests)}`,
    );
    console.log(`  Failed:    ${this._getColoredText("red", numFailedTests)}`);
    console.log(
      `  Pending:   ${this._getColoredText("yellow", numPendingTests)}`,
    );

    // Execution time
    console.log(
      `\n${this._getColoredText("bright", "Time:")}: ${this._getColoredText("cyan", `${this._executionTime.toFixed(2)}s`)}`,
    );

    console.log(this._getBox("", "cyan", false, true));

    // Show appropriate completion message
    if (numTotalTests === 0) {
      console.log(
        `${this._getColoredText("yellow", "⚠")} ${this._getColoredText("bright", "No tests were executed! Check your test files for issues.")}\n`,
      );
    } else if (suiteErrorCount > 0) {
      console.log(
        `${this._getColoredText("yellow", "⚠")} ${this._getColoredText("bright", `${suiteErrorCount} test files had setup errors and didn't execute any tests.`)}\n`,
      );

      if (numFailedTests === 0) {
        console.log(
          `${this._getColoredText("green", "✓")} ${this._getColoredText("bright", "All executed tests passed successfully!")}\n`,
        );
      }
    } else if (numFailedTests === 0) {
      console.log(
        `${this._getColoredText("green", "✓")} ${this._getColoredText("bright", "All tests passed successfully!")}\n`,
      );
    } else if (this._isBail && this._failedTests.length > 0) {
      const failedFile =
        this._failedTests[0].path.split("\\").pop() ||
        this._failedTests[0].path.split("/").pop();
      console.log(
        `${this._getColoredText("red", "x")} ${this._getColoredText("bright", `Tests stopped due to failures in ${failedFile}`)}\n`,
      );
    } else {
      console.log(
        `${this._getColoredText("red", "x")} ${this._getColoredText("bright", `${numFailedTests} tests failed`)} ${this._getColoredText("cyan", "- see details below")}\n`,
      );

      // Quick failure summary for easy reference
      if (numFailedTests > 0) {
        console.log(this._getBox("FAILED TESTS SUMMARY", "red", true));

        let failureCount = 1;
        this._failedTests.forEach((failedFile) => {
          const fileName =
            failedFile.path.split("\\").pop() ||
            failedFile.path.split("/").pop();
          console.log(this._getColoredText("bright", `File: ${fileName}`));

          failedFile.failedResults.forEach((result) => {
            const testPath =
              result.ancestorTitles.length > 0
                ? `${result.ancestorTitles.join(" > ")} > ${result.title}`
                : result.title;

            console.log(
              `  ${failureCount}. ${this._getColoredText("red", testPath)}`,
            );

            // Extract brief reason for failure
            let errorSummary = "";
            if (result.failureMessages && result.failureMessages.length > 0) {
              const message = result.failureMessages[0];
              const errorLines = message.split("\n");
              const errorFirstLine = errorLines.find((line) =>
                line.trim().startsWith("Error:"),
              );

              if (errorFirstLine) {
                errorSummary = errorFirstLine.trim().replace(/^Error:\s*/, "");
              } else if (errorLines.length > 0) {
                // If no "Error:" line, just use the first line
                errorSummary = errorLines[0].trim();
              }
            }

            if (errorSummary) {
              console.log(
                `     ${this._getColoredText("yellow", "Reason:")} ${errorSummary}`,
              );
            }

            failureCount++;
          });

          console.log(""); // Add space between files
        });

        console.log(this._getBox("", "red", false, true));
        console.log("");
      }
    }

    // Disable the default summary by forcing stdout to write an ANSI escape sequence that clears to the end of screen
    // This requires modifying the reporter to be the only output shown
    process.stdout.write("\u001b[0J");
  }

  _getColoredText(color, text) {
    const colors = {
      green: "\x1b[32m",
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      bright: "\x1b[97m", // Bright white
      dim: "\x1b[2m", // Dimmed text
      default: "", // No color code
      reset: "\x1b[0m",
    };

    return color === "default"
      ? text
      : `${colors[color] || ""}${text}${colors.reset}`;
  }

  _getBox(text, color, isTop = true, isBottom = false) {
    const width = 60;
    const textWidth = text.length;
    const padWidth = Math.max(0, width - textWidth - 4); // 4 for the box corners and sides
    const leftPad = Math.floor(padWidth / 2);
    const rightPad = padWidth - leftPad;

    let result = "";

    // Only draw the top if requested
    if (isTop) {
      result += this._getColoredText(
        color,
        "┌" + "─".repeat(width - 2) + "┐\n",
      );
    }

    // Draw the text line if text is provided
    if (text) {
      result += this._getColoredText(
        color,
        "│ " + " ".repeat(leftPad) + text + " ".repeat(rightPad) + " │\n",
      );
    }

    // Only draw the bottom if requested
    if (isBottom) {
      result += this._getColoredText(color, "└" + "─".repeat(width - 2) + "┘");
    }

    return result;
  }

  _generateProgressBar(percent) {
    const width = 20;
    const completed = Math.floor((width * percent) / 100);
    const remaining = width - completed;

    return `[${this._getColoredText("green", "█".repeat(completed))}${this._getColoredText("dim", "░".repeat(remaining))}]`;
  }

  _generateSuggestion(message, parts) {
    // Generate helpful suggestions based on the error type
    if (message.includes("Expected") && message.includes("Received")) {
      if (parts.expected === parts.received) {
        return "The values are equal but might be different types. Check for string vs number comparison.";
      }

      if (
        message.includes("to be truthy") &&
        (parts.received === "false" ||
          parts.received === "0" ||
          parts.received === '""' ||
          parts.received === "null" ||
          parts.received === "undefined")
      ) {
        return "Your value is falsy. Check if the variable is properly initialized or has the correct value.";
      }

      if (message.includes("to contain") || message.includes("toContain")) {
        return "Check if the array or string actually contains the expected value and watch for case sensitivity.";
      }

      if (
        message.includes("toHaveBeenCalled") ||
        message.includes("toHaveBeenCalledWith")
      ) {
        return "Verify that the mock function was called and with the correct arguments.";
      }

      if (message.includes("to equal") || message.includes("toEqual")) {
        return "Use .toEqual for deep equality checking of object properties rather than .toBe for strict equality.";
      }
    }

    if (
      message.includes("TypeError") ||
      message.includes("ReferenceError") ||
      message.includes("Cannot read property")
    ) {
      return "Check for null/undefined values and ensure all objects/variables are properly initialized.";
    }

    if (message.includes("timeout")) {
      return "Test exceeded the timeout. Check for async operations that don't resolve or complete.";
    }

    if (message.includes("snapshot")) {
      return "Snapshot doesn't match. Review changes and update snapshots if needed with 'jest -u'.";
    }

    return ""; // No specific suggestion
  }
}

module.exports = SummaryReporter;
