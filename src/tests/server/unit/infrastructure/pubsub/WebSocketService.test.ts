import { ILoggerService } from "@/server/infrastructure/logging";
import { WebSocketService } from "@/server/infrastructure/pubsub/WebSocketService";

describe("WebSocketService", () => {
  let webSocketService: WebSocketService;
  let mockLogger: jest.Mocked<ILoggerService>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      createLogger: jest.fn().mockReturnThis(),
    } as any;

    webSocketService = new WebSocketService(mockLogger);
  });

  describe("initialize", () => {
    it("should initialize WebSocket server", () => {
      const server = {} as any;
      webSocketService.initialize(server);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Initializing WebSocket server",
      );
    });
  });

  describe("close", () => {
    it("should close all connections", () => {
      webSocketService.close();
      expect(mockLogger.info).toHaveBeenCalledWith("Closing WebSocket server");
    });
  });

  describe("broadcast", () => {
    it("should broadcast message to all clients", async () => {
      const eventType = "test-event";
      const data = { content: "test message" };
      const result = await webSocketService.broadcast(eventType, data);
      expect(result).toBe(0); // No clients connected initially
    });
  });

  describe("subscribe", () => {
    it("should subscribe client to channel", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      const result = webSocketService.subscribe(clientId, channel);
      expect(result).toBe(false); // Client not found initially
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe client from channel", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      const result = webSocketService.unsubscribe(clientId, channel);
      expect(result).toBe(false); // Client not found initially
    });
  });

  describe("getStats", () => {
    it("should return connection statistics", () => {
      const stats = webSocketService.getStats();
      expect(stats).toEqual({
        totalConnections: 0,
        authenticatedConnections: 0,
        channelCounts: {},
        messagesPerSecond: 0,
        peakConnections: 0,
      });
    });
  });
});
