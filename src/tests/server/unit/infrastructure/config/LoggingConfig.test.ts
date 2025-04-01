import { describe, it, expect } from "vitest";

import { LoggingConfig } from "@infrastructure/config";
import { LogLevel } from "@infrastructure/logging";

describe("LoggingConfig", () => {
  it("should be defined", () => {
    expect(LoggingConfig).toBeDefined();
  });

  describe("LogLevel", () => {
    it("should have defined log levels", () => {
      expect(LogLevel.DEBUG).toBeDefined();
      expect(LogLevel.INFO).toBeDefined();
      expect(LogLevel.WARN).toBeDefined();
      expect(LogLevel.ERROR).toBeDefined();
    });
  });
});
