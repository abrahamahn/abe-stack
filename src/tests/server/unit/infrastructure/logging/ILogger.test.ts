import {
  ILoggerService,
  LogLevel,
  LogMetadata,
  ILogTransport,
} from "@/server/infrastructure/logging/ILogger";

describe("ILoggerService", () => {
  let mockLogger: jest.Mocked<ILoggerService>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      debugObj: jest.fn(),
      info: jest.fn(),
      infoObj: jest.fn(),
      warn: jest.fn(),
      warnObj: jest.fn(),
      error: jest.fn(),
      errorObj: jest.fn(),
      createLogger: jest.fn(),
      withContext: jest.fn(),
      addTransport: jest.fn(),
      setTransports: jest.fn(),
      setMinLevel: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };
  });

  describe("debug", () => {
    it("should log debug message", async () => {
      const message = "Debug message";
      const metadata: LogMetadata = { userId: "user123" };
      await mockLogger.debug(message, metadata);
      expect(mockLogger.debug).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe("info", () => {
    it("should log info message", async () => {
      const message = "Info message";
      const metadata: LogMetadata = { userId: "user123" };
      await mockLogger.info(message, metadata);
      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe("warn", () => {
    it("should log warning message", async () => {
      const message = "Warning message";
      const metadata: LogMetadata = { userId: "user123" };
      await mockLogger.warn(message, metadata);
      expect(mockLogger.warn).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe("error", () => {
    it("should log error message", async () => {
      const message = "Error message";
      const metadata: LogMetadata = { error: "Test error" };
      await mockLogger.error(message, metadata);
      expect(mockLogger.error).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe("setMinLevel", () => {
    it("should set log level", async () => {
      const level = LogLevel.DEBUG;
      await mockLogger.setMinLevel(level);
      expect(mockLogger.setMinLevel).toHaveBeenCalledWith(level);
    });
  });

  describe("addTransport", () => {
    it("should add transport", async () => {
      const transport: ILogTransport = { log: jest.fn() };
      await mockLogger.addTransport(transport);
      expect(mockLogger.addTransport).toHaveBeenCalledWith(transport);
    });
  });

  describe("setTransports", () => {
    it("should set transports", async () => {
      const transports: ILogTransport[] = [{ log: jest.fn() }];
      await mockLogger.setTransports(transports);
      expect(mockLogger.setTransports).toHaveBeenCalledWith(transports);
    });
  });
});
