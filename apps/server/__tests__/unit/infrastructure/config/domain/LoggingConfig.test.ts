import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { LoggingConfigService } from "@/server/infrastructure/config/domain/LoggingConfig";
import { LogLevel } from "@/server/infrastructure/logging/ILoggerService";

describe("LoggingConfig", () => {
  let loggingConfig: LoggingConfigService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };

    // Create new instance of LoggingConfigService
    loggingConfig = new LoggingConfigService();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it("should return default configuration when no environment variables are set", () => {
    const config = loggingConfig.getConfig();
    expect(config.level).toBe(LogLevel.INFO);
    expect(config.prettyPrint).toBe(true);
    expect(config.file).toBeDefined();
    expect(config.file?.enabled).toBe(false);
    expect(config.file?.dir).toBe("logs");
    expect(config.file?.filename).toBe("app.log");
    expect(config.file?.maxSize).toBe(10485760);
    expect(config.file?.maxFiles).toBe(5);
  });

  it("should parse log level from environment variable", () => {
    process.env.LOG_LEVEL = "debug";
    const debugConfig = new LoggingConfigService();
    expect(debugConfig.getConfig().level).toBe(LogLevel.DEBUG);

    process.env.LOG_LEVEL = "info";
    const infoConfig = new LoggingConfigService();
    expect(infoConfig.getConfig().level).toBe(LogLevel.INFO);

    process.env.LOG_LEVEL = "warn";
    const warnConfig = new LoggingConfigService();
    expect(warnConfig.getConfig().level).toBe(LogLevel.WARN);

    process.env.LOG_LEVEL = "error";
    const errorConfig = new LoggingConfigService();
    expect(errorConfig.getConfig().level).toBe(LogLevel.ERROR);

    process.env.LOG_LEVEL = "invalid";
    const invalidConfig = new LoggingConfigService();
    expect(invalidConfig.getConfig().level).toBe(LogLevel.INFO);
  });

  it("should handle file logging configuration", () => {
    process.env.LOG_TO_FILE = "true";
    process.env.LOG_DIR = "custom_logs";
    process.env.LOG_FILENAME = "custom.log";
    process.env.LOG_MAX_SIZE = "20971520"; // 20MB
    process.env.LOG_MAX_FILES = "10";

    const config = loggingConfig.getConfig();
    expect(config.file?.enabled).toBe(true);
    expect(config.file?.dir).toBe("custom_logs");
    expect(config.file?.filename).toBe("custom.log");
    expect(config.file?.maxSize).toBe(20971520);
    expect(config.file?.maxFiles).toBe(10);
  });

  it("should handle invalid numeric values gracefully", () => {
    process.env.LOG_MAX_SIZE = "invalid";
    process.env.LOG_MAX_FILES = "invalid";

    const config = new LoggingConfigService();
    const result = config.getConfig();
    expect(result.file?.maxSize).toBe(10485760); // Default value
    expect(result.file?.maxFiles).toBe(5); // Default value
  });

  it("should disable pretty printing in production", () => {
    process.env.NODE_ENV = "production";
    const config = loggingConfig.getConfig();
    expect(config.prettyPrint).toBe(false);
  });
});
