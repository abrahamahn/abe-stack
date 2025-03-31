const NodeEnvironment = require("jest-environment-node").default;

class DebugEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
  }

  async setup() {
    await super.setup();

    // Add debugging info to the global scope
    this.global.debugTestInfo = {
      testPath: this.testPath,
    };

    // Monkey patch test functions to log when tests are skipped
    const originalTest = this.global.test;
    const originalIt = this.global.it;

    // Wrap 'it' to log when it's called
    this.global.it = function wrappedIt(name, fn, timeout) {
      console.log(`[DEBUG] Test called: "${name}"`);
      if (!fn) {
        console.log(
          `[DEBUG] Test skipped or missing implementation: "${name}"`,
        );
      }
      return originalIt(name, fn, timeout);
    };

    // Copy properties from original 'it'
    for (const prop in originalIt) {
      if (Object.prototype.hasOwnProperty.call(originalIt, prop)) {
        this.global.it[prop] = originalIt[prop];
      }
    }

    // Also wrap 'test' in the same way
    this.global.test = function wrappedTest(name, fn, timeout) {
      console.log(`[DEBUG] Test called: "${name}"`);
      if (!fn) {
        console.log(
          `[DEBUG] Test skipped or missing implementation: "${name}"`,
        );
      }
      return originalTest(name, fn, timeout);
    };

    // Copy properties from original 'test'
    for (const prop in originalTest) {
      if (Object.prototype.hasOwnProperty.call(originalTest, prop)) {
        this.global.test[prop] = originalTest[prop];
      }
    }

    // Also patch describe to log suites
    const originalDescribe = this.global.describe;
    this.global.describe = function wrappedDescribe(name, fn) {
      console.log(`[DEBUG] Suite called: "${name}"`);
      if (!fn) {
        console.log(
          `[DEBUG] Suite skipped or missing implementation: "${name}"`,
        );
      }
      return originalDescribe(name, fn);
    };

    // Copy properties from original 'describe'
    for (const prop in originalDescribe) {
      if (Object.prototype.hasOwnProperty.call(originalDescribe, prop)) {
        this.global.describe[prop] = originalDescribe[prop];
      }
    }
  }
}

module.exports = DebugEnvironment;
