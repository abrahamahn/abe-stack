import { Server as HttpServer, IncomingMessage } from "http";

import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebSocket } from "ws";

import { WebSocketService } from "@/server/infrastructure/pubsub/WebSocketService";

describe("WebSocketService", () => {
  let webSocketService: WebSocketService;
  let mockLogger: any;
  let mockServer: HttpServer;
  let mockWebSocket: WebSocket;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
    } as any;

    mockServer = {
      on: vi.fn(),
    } as any;

    mockWebSocket = {
      on: vi.fn(),
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    webSocketService = new WebSocketService(mockLogger);
  });

  describe("initialize", () => {
    it("should initialize WebSocket server with default options", () => {
      webSocketService.initialize(mockServer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Initializing WebSocket server",
      );
      expect(mockServer.on).toHaveBeenCalled();
    });

    it("should initialize WebSocket server with auth options", () => {
      const authOptions = {
        required: true,
        validateToken: vi.fn(),
        authTimeout: 5000,
      };
      webSocketService.initialize(mockServer, authOptions);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Initializing WebSocket server",
      );
      expect(mockServer.on).toHaveBeenCalled();
    });

    it("should not reinitialize if already initialized", () => {
      webSocketService.initialize(mockServer);
      webSocketService.initialize(mockServer);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "WebSocket server already initialized",
      );
    });
  });

  describe("connection handling", () => {
    it("should handle new client connection", () => {
      const mockReq = {
        socket: { remoteAddress: "127.0.0.1" },
        headers: { "user-agent": "test-agent" },
      } as IncomingMessage;

      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, mockReq);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "close",
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "pong",
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
    });

    it("should handle client disconnect", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const closeHandler = (mockWebSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === "close",
      )[1];
      closeHandler();

      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe("message handling", () => {
    it("should handle auth message", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const messageHandler = (mockWebSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === "message",
      )[1];
      messageHandler(
        JSON.stringify({
          type: "auth",
          data: { userId: "test-user" },
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("auth_success"),
      );
    });

    it("should handle subscribe message", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const messageHandler = (mockWebSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === "message",
      )[1];
      messageHandler(
        JSON.stringify({
          type: "subscribe",
          data: { channel: "test-channel" },
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("subscribe_success"),
      );
    });

    it("should handle unsubscribe message", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const messageHandler = (mockWebSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === "message",
      )[1];
      messageHandler(
        JSON.stringify({
          type: "unsubscribe",
          data: { channel: "test-channel" },
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("unsubscribe_success"),
      );
    });

    it("should handle invalid message format", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const messageHandler = (mockWebSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === "message",
      )[1];
      messageHandler("invalid json");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("Invalid message format"),
      );
    });
  });

  describe("client management", () => {
    it("should authenticate client", async () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = await webSocketService.authenticateClient(
        clientId,
        "test-user",
        { device: "mobile" },
      );

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("auth_result"),
      );
    });

    it("should handle failed authentication", async () => {
      const result = await webSocketService.authenticateClient(
        "non-existent",
        "test-user",
      );

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should disconnect client", () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      webSocketService.disconnectClient(clientId, "test reason");

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining("disconnect"),
      );
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe("channel management", () => {
    it("should subscribe client to channel", () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = webSocketService.subscribe(clientId, "test-channel");

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should unsubscribe client from channel", () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = webSocketService.unsubscribe(clientId, "test-channel");

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should get client channels", () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const channels = webSocketService.getClientChannels(clientId);

      expect(channels).toBeInstanceOf(Set);
    });

    it("should get channel clients", () => {
      const channel = "test-channel";
      const clients = webSocketService.getChannelClients(channel);

      expect(clients).toBeInstanceOf(Set);
    });
  });

  describe("message sending", () => {
    it("should send message to client", async () => {
      const clientId = uuidv4();
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = await webSocketService.sendToClient(
        clientId,
        "test-event",
        { content: "test" },
      );

      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it("should publish message to channel", async () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = await webSocketService.publish(
        "test-channel",
        "test-event",
        { content: "test" },
      );

      expect(result).toBe(0); // No subscribers initially
    });

    it("should broadcast message to all clients", async () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      const result = await webSocketService.broadcast("test-event", {
        content: "test",
      });

      expect(result).toBe(1); // One client connected
    });
  });

  describe("presence management", () => {
    it("should set user presence", async () => {
      await webSocketService.setPresence("test-user", "online", {
        lastActive: new Date(),
      });

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should get user presence", async () => {
      const presence = await webSocketService.getPresence("test-user");
      expect(presence).toBeNull(); // No presence set initially
    });
  });

  describe("statistics", () => {
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

  describe("cleanup", () => {
    it("should close all connections", () => {
      webSocketService.initialize(mockServer);
      const connectionHandler = (mockServer.on as any).mock.calls[0][1];
      connectionHandler(mockWebSocket, {} as IncomingMessage);

      webSocketService.close();

      expect(mockLogger.info).toHaveBeenCalledWith("Closing WebSocket server");
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
