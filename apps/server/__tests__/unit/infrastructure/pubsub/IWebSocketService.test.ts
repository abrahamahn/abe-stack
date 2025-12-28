import { Server } from "http";

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  WebSocketAuthOptions,
  WebSocketMessageOptions,
} from "@/server/infrastructure/pubsub/IWebSocketService";

describe("IWebSocketService", () => {
  let mockWebSocketService: any;

  beforeEach(() => {
    mockWebSocketService = {
      initialize: vi.fn(),
      close: vi.fn(),
      sendToClient: vi.fn(),
      publish: vi.fn(),
      broadcast: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getClientChannels: vi.fn(),
      getChannelClients: vi.fn(),
      authenticateClient: vi.fn(),
      setPresence: vi.fn(),
      getPresence: vi.fn(),
      disconnectClient: vi.fn(),
      getStats: vi.fn(),
    };
  });

  describe("initialize", () => {
    it("should initialize WebSocket server with default options", () => {
      const server = {} as Server;
      mockWebSocketService.initialize(server);
      expect(mockWebSocketService.initialize).toHaveBeenCalledWith(server);
    });

    it("should initialize WebSocket server with auth options", () => {
      const server = {} as Server;
      const authOptions: WebSocketAuthOptions = {
        required: true,
        validateToken: vi.fn(),
        authTimeout: 5000,
      };
      mockWebSocketService.initialize(server, authOptions);
      expect(mockWebSocketService.initialize).toHaveBeenCalledWith(
        server,
        authOptions,
      );
    });
  });

  describe("sendToClient", () => {
    it("should send message to client without options", async () => {
      const clientId = "test-client";
      const eventType = "test-event";
      const data = { content: "test message" };
      mockWebSocketService.sendToClient.mockResolvedValue(true);

      const result = await mockWebSocketService.sendToClient(
        clientId,
        eventType,
        data,
      );
      expect(result).toBe(true);
      expect(mockWebSocketService.sendToClient).toHaveBeenCalledWith(
        clientId,
        eventType,
        data,
      );
    });

    it("should send message to client with options", async () => {
      const clientId = "test-client";
      const eventType = "test-event";
      const data = { content: "test message" };
      const options: WebSocketMessageOptions = {
        requireAck: true,
        messageId: "msg-123",
        ackTimeout: 5000,
        excludeSender: true,
      };
      mockWebSocketService.sendToClient.mockResolvedValue(true);

      const result = await mockWebSocketService.sendToClient(
        clientId,
        eventType,
        data,
        options,
      );
      expect(result).toBe(true);
      expect(mockWebSocketService.sendToClient).toHaveBeenCalledWith(
        clientId,
        eventType,
        data,
        options,
      );
    });
  });

  describe("publish", () => {
    it("should publish message to channel", async () => {
      const channel = "test-channel";
      const eventType = "test-event";
      const data = { content: "test message" };
      mockWebSocketService.publish.mockResolvedValue(5);

      const result = await mockWebSocketService.publish(
        channel,
        eventType,
        data,
      );
      expect(result).toBe(5);
      expect(mockWebSocketService.publish).toHaveBeenCalledWith(
        channel,
        eventType,
        data,
      );
    });

    it("should publish message to channel with options", async () => {
      const channel = "test-channel";
      const eventType = "test-event";
      const data = { content: "test message" };
      const options: WebSocketMessageOptions = {
        requireAck: true,
        messageId: "msg-123",
        ackTimeout: 5000,
        excludeSender: true,
      };
      mockWebSocketService.publish.mockResolvedValue(5);

      const result = await mockWebSocketService.publish(
        channel,
        eventType,
        data,
        options,
      );
      expect(result).toBe(5);
      expect(mockWebSocketService.publish).toHaveBeenCalledWith(
        channel,
        eventType,
        data,
        options,
      );
    });
  });

  describe("broadcast", () => {
    it("should broadcast message to all clients", async () => {
      const eventType = "test-event";
      const data = { content: "test message" };
      mockWebSocketService.broadcast.mockResolvedValue(10);

      const result = await mockWebSocketService.broadcast(eventType, data);
      expect(result).toBe(10);
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        eventType,
        data,
      );
    });

    it("should broadcast message with options", async () => {
      const eventType = "test-event";
      const data = { content: "test message" };
      const options: WebSocketMessageOptions = {
        requireAck: true,
        messageId: "msg-123",
        ackTimeout: 5000,
        excludeSender: true,
      };
      mockWebSocketService.broadcast.mockResolvedValue(10);

      const result = await mockWebSocketService.broadcast(
        eventType,
        data,
        options,
      );
      expect(result).toBe(10);
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        eventType,
        data,
        options,
      );
    });
  });

  describe("subscribe", () => {
    it("should subscribe client to channel", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      mockWebSocketService.subscribe.mockReturnValue(true);

      const result = mockWebSocketService.subscribe(clientId, channel);
      expect(result).toBe(true);
      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith(
        clientId,
        channel,
      );
    });

    it("should handle failed subscription", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      mockWebSocketService.subscribe.mockReturnValue(false);

      const result = mockWebSocketService.subscribe(clientId, channel);
      expect(result).toBe(false);
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
      mockWebSocketService.unsubscribe.mockReturnValue(true);

      const result = mockWebSocketService.unsubscribe(clientId, channel);
      expect(result).toBe(true);
      expect(mockWebSocketService.unsubscribe).toHaveBeenCalledWith(
        clientId,
        channel,
      );
    });

    it("should handle failed unsubscription", () => {
      const clientId = "test-client";
      const channel = "test-channel";
      mockWebSocketService.unsubscribe.mockReturnValue(false);

      const result = mockWebSocketService.unsubscribe(clientId, channel);
      expect(result).toBe(false);
      expect(mockWebSocketService.unsubscribe).toHaveBeenCalledWith(
        clientId,
        channel,
      );
    });
  });

  describe("getClientChannels", () => {
    it("should return client's subscribed channels", () => {
      const clientId = "test-client";
      const channels = new Set(["channel1", "channel2"]);
      mockWebSocketService.getClientChannels.mockReturnValue(channels);

      const result = mockWebSocketService.getClientChannels(clientId);
      expect(result).toEqual(channels);
      expect(mockWebSocketService.getClientChannels).toHaveBeenCalledWith(
        clientId,
      );
    });
  });

  describe("getChannelClients", () => {
    it("should return clients subscribed to channel", () => {
      const channel = "test-channel";
      const clients = new Set(["client1", "client2"]);
      mockWebSocketService.getChannelClients.mockReturnValue(clients);

      const result = mockWebSocketService.getChannelClients(channel);
      expect(result).toEqual(clients);
      expect(mockWebSocketService.getChannelClients).toHaveBeenCalledWith(
        channel,
      );
    });
  });

  describe("authenticateClient", () => {
    it("should authenticate client", async () => {
      const clientId = "test-client";
      const userId = "test-user";
      const metadata = { role: "user" };
      mockWebSocketService.authenticateClient.mockResolvedValue(true);

      const result = await mockWebSocketService.authenticateClient(
        clientId,
        userId,
        metadata,
      );
      expect(result).toBe(true);
      expect(mockWebSocketService.authenticateClient).toHaveBeenCalledWith(
        clientId,
        userId,
        metadata,
      );
    });

    it("should handle failed authentication", async () => {
      const clientId = "test-client";
      const userId = "test-user";
      mockWebSocketService.authenticateClient.mockResolvedValue(false);

      const result = await mockWebSocketService.authenticateClient(
        clientId,
        userId,
      );
      expect(result).toBe(false);
      expect(mockWebSocketService.authenticateClient).toHaveBeenCalledWith(
        clientId,
        userId,
      );
    });
  });

  describe("setPresence", () => {
    it("should set user presence", async () => {
      const userId = "test-user";
      const status = "online" as const;
      const metadata = { lastActive: new Date() };
      mockWebSocketService.setPresence.mockResolvedValue(undefined);

      await mockWebSocketService.setPresence(userId, status, metadata);
      expect(mockWebSocketService.setPresence).toHaveBeenCalledWith(
        userId,
        status,
        metadata,
      );
    });
  });

  describe("getPresence", () => {
    it("should get user presence", async () => {
      const userId = "test-user";
      const presence = {
        userId,
        status: "online" as const,
        lastSeen: new Date(),
        clientIds: ["client1", "client2"],
      };
      mockWebSocketService.getPresence.mockResolvedValue(presence);

      const result = await mockWebSocketService.getPresence(userId);
      expect(result).toEqual(presence);
      expect(mockWebSocketService.getPresence).toHaveBeenCalledWith(userId);
    });

    it("should return null for non-existent user", async () => {
      const userId = "test-user";
      mockWebSocketService.getPresence.mockResolvedValue(null);

      const result = await mockWebSocketService.getPresence(userId);
      expect(result).toBeNull();
      expect(mockWebSocketService.getPresence).toHaveBeenCalledWith(userId);
    });
  });

  describe("disconnectClient", () => {
    it("should disconnect client with reason", () => {
      const clientId = "test-client";
      const reason = "Test reason";
      mockWebSocketService.disconnectClient(clientId, reason);
      expect(mockWebSocketService.disconnectClient).toHaveBeenCalledWith(
        clientId,
        reason,
      );
    });

    it("should disconnect client without reason", () => {
      const clientId = "test-client";
      mockWebSocketService.disconnectClient(clientId);
      expect(mockWebSocketService.disconnectClient).toHaveBeenCalledWith(
        clientId,
      );
    });
  });

  describe("getStats", () => {
    it("should return connection statistics", () => {
      const stats = {
        totalConnections: 100,
        authenticatedConnections: 80,
        channelCounts: { "test-channel": 50 },
        messagesPerSecond: 10,
        peakConnections: 150,
      };
      mockWebSocketService.getStats.mockReturnValue(stats);

      const result = mockWebSocketService.getStats();
      expect(result).toEqual(stats);
      expect(mockWebSocketService.getStats).toHaveBeenCalled();
    });
  });
});
