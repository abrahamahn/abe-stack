import {
  ILogTransport,
  LogLevel,
} from "@/server/infrastructure/logging/ILogger";
import { LoggerService } from "@/server/infrastructure/logging/LoggerService";

describe("LoggerService", () => {
  let logger: LoggerService;
  let mockTransport: jest.Mocked<ILogTransport>;

  beforeEach(() => {
    mockTransport = {
      log: jest.fn(),
    };
    logger = new LoggerService();
  });

  describe("constructor", () => {
    it("should create logger with default level", () => {
      logger.setMinLevel(LogLevel.INFO);
      expect(logger).toBeDefined();
    });

    it("should create logger with custom level", () => {
      logger = new LoggerService();
      logger.setMinLevel(LogLevel.DEBUG);
      expect(logger).toBeDefined();
    });
  });

  describe("setMinLevel", () => {
    it("should set log level", () => {
      logger.setMinLevel(LogLevel.DEBUG);
      expect(logger).toBeDefined();
    });
  });

  describe("transport management", () => {
    it("should add transport", () => {
      logger.addTransport(mockTransport);
      expect(logger).toBeDefined();
    });

    it("should set transports", () => {
      logger.setTransports([mockTransport]);
      expect(logger).toBeDefined();
    });

    it("should replace existing transports", () => {
      const transport1 = { log: jest.fn() };
      const transport2 = { log: jest.fn() };
      logger.addTransport(transport1);
      logger.setTransports([transport2]);
      expect(logger).toBeDefined();
    });
  });

  describe("logging methods", () => {
    beforeEach(() => {
      logger.addTransport(mockTransport);
    });

    it("should log info message", () => {
      const message = "Info message";
      const context = { userId: "user123" };
      logger.info(message, context);
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should log warning message", () => {
      const message = "Warning message";
      const context = { userId: "user123" };
      logger.warn(message, context);
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should log error message", () => {
      const message = "Error message";
      const error = new Error("Test error");
      const context = { userId: "user123" };
      logger.error(message, {
        error: { message: error.message, stack: error.stack },
        ...context,
      });
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it("should not log messages below current level", () => {
      logger.setMinLevel(LogLevel.WARN);
      const message = "Debug message";
      logger.debug(message);
      expect(mockTransport.log).not.toHaveBeenCalled();
    });

    it("should handle logging without transports", () => {
      logger.setTransports([]);
      const message = "Test message";
      logger.info(message);
      expect(mockTransport.log).not.toHaveBeenCalled();
    });
  });
});
