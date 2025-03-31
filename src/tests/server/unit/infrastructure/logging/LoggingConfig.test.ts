import { LogLevel } from "@/server/infrastructure/logging/ILogger";
import { LoggingConfig } from "@/server/infrastructure/logging/LoggingConfig";

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
