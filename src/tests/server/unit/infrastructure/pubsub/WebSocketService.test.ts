import { Server as HttpServer } from "http";

import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line import/order
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("ws", () => {
  const mockWebSocket = {
    on: vi.fn(),
    send: vi.fn().mockImplementation((data) => data),
    ping: vi.fn(),
    terminate: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
  };

  const mockWebSocketServer = {
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set([mockWebSocket]),
  };

  // Return a factory for creating mockWebSocketServer
  return {
    WebSocketServer: vi.fn().mockImplementation(() => mockWebSocketServer),
    WebSocket: {
      OPEN: 1,
    },
  };
});

// Import the mock module to access it in tests
import * as WsMock from "ws";

import { WebSocketService } from "@/server/infrastructure/pubsub/WebSocketService";

// Create a minimal mock that allows tests to pass without depending on internal implementations
describe("WebSocketService", () => {
  let webSocketService: WebSocketService;
  let mockLogger: any;
  let mockServer: HttpServer;
  // Get access to the ws mock for easier testing
  const wsMockModule = WsMock as any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
    };

    mockServer = {
      on: vi.fn(),
    } as any;

    webSocketService = new WebSocketService(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize WebSocket server with default options", () => {
      webSocketService.initialize(mockServer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Initializing WebSocket server",
      );
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
    });

    it("should not reinitialize if already initialized", () => {
      webSocketService.initialize(mockServer);
      webSocketService.initialize(mockServer);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "WebSocket server already initialized",
      );
    });
  });

  describe("client and channel management", () => {
    beforeEach(() => {
      webSocketService.initialize(mockServer);
      // Reset mocks to start clean for each test
      vi.clearAllMocks();
    });

    it("should manage client connections", () => {
      // Manually add a client to the service
      const clientId = uuidv4();
      (webSocketService as any).clients.set(clientId, {
        clientId,
        subscriptions: new Set(),
        authenticated: true,
        isAlive: true,
        connectedAt: new Date(),
        lastActivity: new Date(),
        state: "connected",
      });

      // Check that we have internal clients after setup
      const stats = webSocketService.getStats();
      expect(stats.totalConnections).toBe(1);
    });

    it("should close connections on shutdown", () => {
      webSocketService.close();
      expect(mockLogger.info).toHaveBeenCalledWith("WebSocket server closed");
    });
  });

  describe("interaction with connected clients", () => {
    let internalClientId: string;

    beforeEach(() => {
      webSocketService.initialize(mockServer);

      // Create our own client ID and insert it directly into the service
      internalClientId = uuidv4();

      // Get the mockWebSocket from the mock
      const mockWebSocket =
        wsMockModule.WebSocketServer.mock.results[0].value.clients
          .values()
          .next().value;

      // Manually register a client in the service's internal map
      const client = {
        ws: mockWebSocket,
        clientId: internalClientId,
        subscriptions: new Set<string>(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        state: "connected",
        authenticated: true,
        isAlive: true,
        pendingAcks: new Map(),
        metadata: {},
      };

      (webSocketService as any).clients.set(internalClientId, client);
    });

    it("should handle presence management", async () => {
      const userId = "test-user";

      // Add user connection mapping
      (webSocketService as any).userConnections.set(
        userId,
        new Set([internalClientId]),
      );

      await webSocketService.setPresence(userId, "online");
      const presence = await webSocketService.getPresence(userId);

      expect(presence).not.toBeNull();
      expect(presence?.status).toBe("online");
      expect(presence?.userId).toBe(userId);
    });

    it("should handle channel subscriptions", () => {
      const result = webSocketService.subscribe(
        internalClientId,
        "test-channel",
      );
      expect(result).toBe(true);

      const channels = webSocketService.getClientChannels(internalClientId);
      expect(channels.has("test-channel")).toBe(true);

      const clients = webSocketService.getChannelClients("test-channel");
      expect(clients.has(internalClientId)).toBe(true);
    });

    it("should handle message sending", async () => {
      // Override the mock WebSocket's readyState to ensure the message is sent
      const clients = (webSocketService as any).clients;
      const client = clients.get(internalClientId);
      client.ws.readyState = 1; // OPEN

      const result = await webSocketService.sendToClient(
        internalClientId,
        "test-event",
        { content: "test" },
      );

      // Just check the result, which will be true if the message was sent
      expect(result).toBe(true);
      // Verify the logger was called, which is a sign the method executed successfully
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
});
