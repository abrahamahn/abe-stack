import { describe, it, expect } from "vitest";

import { LogLevel } from "@infrastructure/logging";

import { LoggingConfigService } from "@/server/infrastructure/config/domain/LoggingConfig";

describe("LoggingConfig", () => {
  it("should be defined", () => {
    expect(LoggingConfigService).toBeDefined();
  });

  it("LogLevel > should have defined log levels", () => {
    expect(LogLevel.DEBUG).toBeDefined();
    expect(LogLevel.INFO).toBeDefined();
    expect(LogLevel.WARN).toBeDefined();
    expect(LogLevel.ERROR).toBeDefined();
  });
});
