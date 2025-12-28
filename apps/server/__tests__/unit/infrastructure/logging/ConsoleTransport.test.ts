import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { LogLevel, ConsoleTransport } from "@infrastructure/logging";

describe("ConsoleTransport", () => {
  let transport: ConsoleTransport;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    transport = new ConsoleTransport();
    consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("log", () => {
    it("should log debug messages", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        message: "Debug message",
      };
      transport.log(entry);
      expect(console.debug).toHaveBeenCalled();
    });

    it("should log info messages", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Info message",
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalled();
    });

    it("should log warn messages", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.WARN,
        message: "Warning message",
      };
      transport.log(entry);
      expect(console.warn).toHaveBeenCalled();
    });

    it("should log error messages", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        message: "Error message",
      };
      transport.log(entry);
      expect(console.error).toHaveBeenCalled();
    });

    it("should include service name in output", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        service: "TestService",
        message: "Service message",
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestService]"),
      );
    });

    it("should include correlation ID in output", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        correlationId: "corr123",
        message: "Correlation message",
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("(corr123)"),
      );
    });

    it("should include context in output", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Context message",
        context: { key: "value" },
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('context={"key":"value"}'),
      );
    });

    it("should include metadata in output", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Metadata message",
        metadata: { meta: "data" },
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('{"meta":"data"}'),
      );
    });

    it("should include structured data in output", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Structured data message",
        structuredData: { data: "value" },
      };
      transport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('{"data":"value"}'),
      );
    });
  });

  describe("pretty printing", () => {
    let prettyTransport: ConsoleTransport;

    beforeEach(() => {
      prettyTransport = new ConsoleTransport(true);
    });

    it("should format output with colors and indentation", () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: "Pretty message",
        context: { key: "value" },
        metadata: { meta: "data" },
        structuredData: { data: "value" },
      };
      prettyTransport.log(entry);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("\x1b[32mINFO\x1b[0m"), // Green color for INFO
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("\n  \x1b[36mContext:\x1b[0m"), // Cyan for Context
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("\n  \x1b[35mMetadata:\x1b[0m"), // Magenta for Metadata
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("\n  \x1b[32mData:\x1b[0m"), // Green for Data
      );
    });
  });
});
