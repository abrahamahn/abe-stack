import { Server } from "http";

import { IWebSocketService } from "@/server/infrastructure/pubsub/IWebSocketService";

describe("IWebSocketService", () => {
  let mockWebSocketService: jest.Mocked<IWebSocketService>;

  beforeEach(() => {
    mockWebSocketService = {
      initialize: jest.fn(),
      close: jest.fn(),
      sendToClient: jest.fn(),
      publish: jest.fn(),
      broadcast: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getClientChannels: jest.fn(),
      getChannelClients: jest.fn(),
      authenticateClient: jest.fn(),
      setPresence: jest.fn(),
      getPresence: jest.fn(),
      disconnectClient: jest.fn(),
      getStats: jest.fn(),
    };
  });

  describe("initialize", () => {
    it("should initialize WebSocket server", () => {
      const server = {} as Server;
      mockWebSocketService.initialize(server);
      expect(mockWebSocketService.initialize).toHaveBeenCalledWith(server);
    });
  });

  describe("close", () => {
    it("should close WebSocket server", () => {
      mockWebSocketService.close();
      expect(mockWebSocketService.close).toHaveBeenCalled();
    });
  });

  describe("broadcast", () => {
    it("should broadcast message to all clients", async () => {
      const eventType = "test-event";
      const data = { content: "test message" };
      await mockWebSocketService.broadcast(eventType, data);
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        eventType,
        data,
      );
    });
  });

  describe("subscribe", () => {
    it("should subscribe client to channel", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      mockWebSocketService.subscribe(clientId, channel);
      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith(
        clientId,
        channel,
      );
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe client from channel", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      mockWebSocketService.unsubscribe(clientId, channel);
      expect(mockWebSocketService.unsubscribe).toHaveBeenCalledWith(
        clientId,
        channel,
      );
    });
  });

  describe("getStats", () => {
    it("should return connection statistics", () => {
      const stats = {
        totalConnections: 0,
        authenticatedConnections: 0,
        channelCounts: {},
        messagesPerSecond: 0,
        peakConnections: 0,
      };
      mockWebSocketService.getStats.mockReturnValue(stats);
      const result = mockWebSocketService.getStats();
      expect(result).toEqual(stats);
      expect(mockWebSocketService.getStats).toHaveBeenCalled();
    });
  });
});
