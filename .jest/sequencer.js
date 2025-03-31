const Sequencer = require("@jest/test-sequencer").default;
const path = require("path");

/**
 * Custom test sequencer that prioritizes database and DI tests first
 * and runs unit tests before integration tests for better error isolation
 */
class CustomSequencer extends Sequencer {
  /**
   * Sort test paths to optimize overall test run
   * @param {Array} tests - Array of test file paths
   * @returns {Array} Sorted test array
   */
  sort(tests) {
    // Return a new array of tests sorted by priority
    return [...tests].sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      // First priority: Database and core infrastructure (run these first to detect major issues)
      const isInfraA =
        pathA.includes("infrastructure/database") ||
        pathA.includes("infrastructure/di");
      const isInfraB =
        pathB.includes("infrastructure/database") ||
        pathB.includes("infrastructure/di");
      if (isInfraA && !isInfraB) return -1;
      if (!isInfraA && isInfraB) return 1;

      // Second priority: Unit tests before integration tests
      const isUnitA = pathA.includes("/unit/");
      const isUnitB = pathB.includes("/unit/");
      if (isUnitA && !isUnitB) return -1;
      if (!isUnitA && isUnitB) return 1;

      // Third priority: Known stable tests before potentially problematic ones
      const isStableA =
        !pathA.includes("experimental") && !pathA.includes("wip");
      const isStableB =
        !pathB.includes("experimental") && !pathB.includes("wip");
      if (isStableA && !isStableB) return -1;
      if (!isStableA && isStableB) return 1;

      // Fourth priority: Alphabetical order for predictability
      return pathA.localeCompare(pathB);
    });
  }
}

module.exports = CustomSequencer;
