import { Server as HttpServer, IncomingMessage } from "http";

import { inject, injectable } from "inversify";
import { v4 as uuidv4 } from "uuid";
import * as WS from "ws";

import { TYPES } from "@/server/infrastructure/di";

import {
  IWebSocketService,
  WebSocketMessageOptions,
  WebSocketAuthOptions,
  PresenceInfo,
  ClientState,
} from "./IWebSocketService";

import type { ILoggerService } from "@infrastructure/logging";

/**
 * User activity types
 */
export interface UserActivity {
  /**
   * Type of activity
   */
  type: "typing" | "viewing" | "reacting";

  /**
   * Target ID (e.g., conversation ID, content ID)
   */
  targetId?: string;

  /**
   * Channel where activity is happening
   */
  channel?: string;

  /**
   * When the activity started
   */
  timestamp: Date;

  /**
   * Additional activity data
   */
  data?: Record<string, unknown>;
}

/**
 * Client connection with user information
 */
interface ClientConnection {
  ws: WS.WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  clientId: string;
  connectedAt: Date;
  lastActivity: Date;
  state: ClientState;
  authenticated: boolean;
  isAlive: boolean;
  metadata?: Record<string, unknown>;
  pendingAcks: Map<
    string,
    {
      timeout: NodeJS.Timeout;
      callback: (success: boolean) => void;
    }
  >;
}

/**
 * WebSocket message format
 */
export interface WebSocketMessage {
  type: string;
  eventType?: string;
  channel?: string;
  data?: unknown;
  messageId?: string;
  error?: string;
}

/**
 * WebSocket service for real-time communication
 */
@injectable()
export class WebSocketService implements IWebSocketService {
  private wss: WS.WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private userPresence: Map<string, PresenceInfo> = new Map();
  private authOptions: WebSocketAuthOptions | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly pingIntervalMs = 30000; // 30 seconds
  private messageCount = 0;
  private messageCountStartTime = Date.now();
  private peakConnections = 0;

  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService,
  ) {
    this.logger = logger.createLogger("WebSocketService");
  }

  /**
   * Initialize the WebSocket server
   * @param server HTTP server to attach to
   * @param authOptions Authentication options
   */
  public initialize(
    server: HttpServer,
    authOptions?: WebSocketAuthOptions,
  ): void {
    if (this.wss) {
      this.logger.warn("WebSocket server already initialized");
      return;
    }

    this.logger.info("Initializing WebSocket server");
    this.authOptions = authOptions || null;

    this.wss = new WS.WebSocketServer({ server });

    this.wss.on("connection", (ws: WS.WebSocket, req: IncomingMessage) => {
      const clientId = uuidv4();
      this.logger.debug(`New client connected: ${clientId}`);

      const client: ClientConnection = {
        ws,
        clientId,
        subscriptions: new Set<string>(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        state: ClientState.CONNECTING,
        authenticated: !this.authOptions?.required,
        isAlive: true,
        pendingAcks: new Map(),
        metadata: {
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        },
      };

      this.clients.set(clientId, client);
      this.updatePeakConnections();

      // Send welcome message with client ID
      this.sendMessage(ws, {
        type: "system",
        eventType: "connection",
        data: {
          clientId,
          requiresAuth: this.authOptions?.required || false,
        },
      });

      // Set up authentication timeout if required
      if (this.authOptions?.required) {
        const timeout = this.authOptions.authTimeout || 10000;
        setTimeout(() => {
          const currentClient = this.clients.get(clientId);
          if (currentClient && !currentClient.authenticated) {
            this.logger.debug(`Authentication timeout for client: ${clientId}`);
            this.disconnectClient(clientId, "Authentication timeout");
          }
        }, timeout);
      }

      // Set up event listeners
      ws.on("message", (message: WS.Data) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(
            message.toString(),
          );
          this.handleMessage(clientId, parsedMessage);
        } catch (error) {
          this.logger.error("Error parsing WebSocket message", {
            error,
            clientId,
          });
          this.sendMessage(ws, {
            type: "error",
            data: { message: "Invalid message format" },
          });
        }
      });

      ws.on("close", () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on("pong", () => {
        if (client) {
          client.isAlive = true;
        }
      });

      ws.on("error", (error) => {
        this.logger.error("WebSocket error", { error, clientId });
      });
    });

    // Set up ping interval to detect disconnected clients
    this.pingInterval = setInterval(() => {
      this.checkConnections();
    }, this.pingIntervalMs);

    this.logger.info("WebSocket server initialized");
  }

  /**
   * Handles incoming messages from clients
   */
  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      this.logger.warn(`Message received for unknown client: ${clientId}`);
      return;
    }

    this.logger.debug(`Received message from client ${clientId}`, {
      type: message.type,
    });

    switch (message.type) {
      case "auth":
        this.handleAuth(clientId, client, message);
        break;
      case "subscribe":
        this.handleSubscribe(clientId, client, message);
        break;
      case "unsubscribe":
        this.handleUnsubscribe(clientId, client, message);
        break;
      case "ack":
        this.handleAcknowledgment(clientId, message);
        break;
      default:
        this.logger.debug(`Unhandled message type: ${message.type}`, {
          clientId,
        });
        this.sendMessage(client.ws, {
          type: "error",
          data: { message: `Unsupported message type: ${message.type}` },
        });
    }
  }

  /**
   * Handle client authentication
   */
  private handleAuth(
    clientId: string,
    client: ClientConnection,
    message: WebSocketMessage,
  ): void {
    const data = message.data as { userId: string };

    if (!data.userId) {
      this.logger.warn("Auth message missing userId", { clientId });
      return;
    }

    const userId = data.userId;

    // Update client with userId
    client.userId = userId;

    // Track user's connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)?.add(clientId);

    this.logger.debug("Client authenticated", {
      clientId,
      userId,
    });

    // Send confirmation
    client.ws.send(
      JSON.stringify({
        type: "auth_success",
        data: {
          userId,
          clientId,
        },
      }),
    );
  }

  /**
   * Handle channel subscription
   */
  private handleSubscribe(
    clientId: string,
    client: ClientConnection,
    message: WebSocketMessage,
  ): void {
    const data = message.data as { channel: string };
    const channel = data.channel;

    if (!channel) {
      this.logger.warn("Subscribe message missing channel", { clientId });
      return;
    }

    // Add to client's subscriptions
    client.subscriptions.add(channel);

    // Add client to channel's subscribers
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)?.add(clientId);

    // Send confirmation
    client.ws.send(
      JSON.stringify({
        type: "subscribe_success",
        data: {
          channel,
        },
      }),
    );
  }

  /**
   * Handle channel unsubscription
   */
  private handleUnsubscribe(
    clientId: string,
    client: ClientConnection,
    message: WebSocketMessage,
  ): void {
    const data = message.data as { channel: string };
    const channel = data.channel;

    if (!channel) {
      this.logger.warn("Unsubscribe message missing channel", { clientId });
      return;
    }

    // Remove from client's subscriptions
    client.subscriptions.delete(channel);

    // Remove client from channel's subscribers
    this.channels.get(channel)?.delete(clientId);

    // Remove channel if no subscribers left
    if (this.channels.get(channel)?.size === 0) {
      this.channels.delete(channel);
    }

    // Send confirmation
    client.ws.send(
      JSON.stringify({
        type: "unsubscribe_success",
        data: {
          channel,
        },
      }),
    );
  }

  /**
   * Handle client disconnect
   * @param clientId Client ID
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    // Remove from user connections
    if (client.userId) {
      this.userConnections.get(client.userId)?.delete(clientId);

      // Remove user connections map entry if no connections left
      if (this.userConnections.get(client.userId)?.size === 0) {
        this.userConnections.delete(client.userId);

        // Update user presence to offline if this was the last connection
        this.setPresence(client.userId, "offline");
      }
    }

    // Remove from all subscribed channels
    for (const channel of client.subscriptions) {
      this.channels.get(channel)?.delete(clientId);

      // Remove channel if no subscribers left
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    }

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Publish a message to a specific channel
   */
  public async publish(
    channel: string,
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<number> {
    if (!channel || !eventType) {
      this.logger.warn("Cannot publish: missing channel or eventType");
      return 0;
    }

    const subscribers = this.channels.get(channel);
    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`No subscribers for channel: ${channel}`);
      return 0;
    }

    this.logger.debug(`Publishing to channel ${channel}`, {
      eventType,
      subscriberCount: subscribers.size,
    });

    const messageId = options?.messageId || uuidv4();
    const message: WebSocketMessage = {
      type: "message",
      eventType,
      channel,
      data,
      messageId,
    };

    let sentCount = 0;
    const promises: Promise<boolean>[] = [];

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client) {
        promises.push(
          this.sendMessageWithAck(client, message, options).then((success) => {
            if (success) sentCount++;
            return success;
          }),
        );
      }
    }

    await Promise.all(promises);
    return sentCount;
  }

  /**
   * Close all connections and stop the WebSocket server
   */
  public close(): void {
    this.logger.info("Closing WebSocket server");

    // Clear the ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all client connections gracefully
    this.clients.forEach((client) => {
      try {
        client.ws.close(1000, "Server shutting down");
      } catch (error) {
        this.logger.error("Error closing client connection", {
          error,
          clientId: client.clientId,
        });
      }
    });

    // Clear all tracking maps
    this.clients.clear();
    this.userConnections.clear();
    this.channels.clear();
    this.userPresence.clear();

    // Close the server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.logger.info("WebSocket server closed");
  }

  /**
   * Periodically check connections and clean up dead ones
   */
  private checkConnections(): void {
    this.clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        this.logger.debug(`Terminating inactive connection: ${clientId}`);
        client.ws.terminate();
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }

  /**
   * Send a message to a specific client
   */
  public async sendToClient(
    clientId: string,
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<boolean> {
    if (!clientId || !eventType) {
      this.logger.warn("Cannot send to client: missing clientId or eventType");
      return false;
    }

    const client = this.clients.get(clientId);
    if (!client) {
      this.logger.debug(`Client not found: ${clientId}`);
      return false;
    }

    const messageId = options?.messageId || uuidv4();
    const message: WebSocketMessage = {
      type: "message",
      eventType,
      data,
      messageId,
    };

    this.logger.debug(`Sending message to client ${clientId}`, { eventType });
    return this.sendMessageWithAck(client, message, options);
  }

  /**
   * Broadcast a message to all connected clients
   * @param eventType Event type
   * @param data Message data
   * @param options Message options
   * @returns Number of clients the message was sent to
   */
  public async broadcast(
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<number> {
    if (!eventType) {
      this.logger.warn("Cannot broadcast: missing eventType");
      return 0;
    }

    this.logger.debug(`Broadcasting message to all clients`, {
      eventType,
      clientCount: this.clients.size,
    });

    const messageId = options?.messageId || uuidv4();
    const message: WebSocketMessage = {
      type: "message",
      eventType,
      data,
      messageId,
    };

    let sentCount = 0;
    const promises: Promise<boolean>[] = [];

    this.clients.forEach((client) => {
      promises.push(
        this.sendMessageWithAck(client, message, options).then((success) => {
          if (success) sentCount++;
          return success;
        }),
      );
    });

    await Promise.all(promises);
    return sentCount;
  }

  /**
   * Subscribe a client to a channel
   */
  public subscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client || !channel) {
      return false;
    }

    // Add client to channel
    client.subscriptions.add(channel);

    // Track channel subscribers
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set<string>());
    }
    this.channels.get(channel)?.add(clientId);

    this.logger.debug(`Subscribed client ${clientId} to channel ${channel}`);
    return true;
  }

  /**
   * Unsubscribe a client from a channel
   */
  public unsubscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client || !channel) {
      return false;
    }

    // Remove client from channel
    client.subscriptions.delete(channel);

    // Update channel subscribers
    if (this.channels.has(channel)) {
      this.channels.get(channel)?.delete(clientId);

      // Clean up empty channels
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    }

    this.logger.debug(
      `Unsubscribed client ${clientId} from channel ${channel}`,
    );
    return true;
  }

  /**
   * Get the channels a client is subscribed to
   */
  public getClientChannels(clientId: string): Set<string> {
    const client = this.clients.get(clientId);
    if (!client) {
      return new Set();
    }
    return new Set(client.subscriptions);
  }

  /**
   * Get all clients subscribed to a channel
   */
  public getChannelClients(channel: string): Set<string> {
    const clients = this.channels.get(channel);
    if (!clients) {
      return new Set();
    }
    return new Set(clients);
  }

  /**
   * Send a message to a client with optional acknowledgment tracking
   */
  private async sendMessageWithAck(
    client: ClientConnection,
    message: WebSocketMessage,
    options?: WebSocketMessageOptions,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (options?.requireAck && message.messageId) {
        // Set up acknowledgment tracking
        const timeout = setTimeout(() => {
          // Handle acknowledgment timeout
          const pendingAck = client.pendingAcks.get(
            message.messageId as string,
          );
          if (pendingAck) {
            pendingAck.callback(false);
            client.pendingAcks.delete(message.messageId as string);
            this.logger.debug(
              `Acknowledgment timeout for message ${message.messageId}`,
              {
                clientId: client.clientId,
              },
            );
            resolve(false);
          }
        }, options.ackTimeout || 5000);

        // Store callback for later resolution
        client.pendingAcks.set(message.messageId, {
          timeout,
          callback: (success: boolean) => {
            resolve(success);
            if (!success) {
              this.logger.debug(
                `Message ${message.messageId} was not acknowledged`,
                {
                  clientId: client.clientId,
                },
              );
            }
          },
        });
      } else {
        // No acknowledgment required
        resolve(true);
      }

      if (!this.sendMessage(client.ws, message)) {
        // Failed to send message
        if (message.messageId) {
          const pendingAck = client.pendingAcks.get(message.messageId);
          if (pendingAck) {
            clearTimeout(pendingAck.timeout);
            client.pendingAcks.delete(message.messageId);
          }
        }
        resolve(false);
      }
    });
  }

  /**
   * Send a raw message to a WebSocket
   */
  private sendMessage(ws: WS.WebSocket, message: WebSocketMessage): boolean {
    if (ws.readyState === WS.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.logger.error("Failed to send message", { error });
        return false;
      }
    }
    return false;
  }

  /**
   * Handles message acknowledgments
   */
  private handleAcknowledgment(
    clientId: string,
    message: WebSocketMessage,
  ): void {
    const messageId = message.messageId;
    if (!messageId) {
      this.logger.warn("Ack message missing messageId", { clientId });
      return;
    }

    const client = this.clients.get(clientId);
    if (!client) return;

    const pendingAck = client.pendingAcks.get(messageId);
    if (pendingAck) {
      clearTimeout(pendingAck.timeout);
      pendingAck.callback(true);
      client.pendingAcks.delete(messageId);
      this.logger.debug(
        `Received ack for message ${messageId} from client ${clientId}`,
      );
    }
  }

  /**
   * Set basic presence data for a user (infrastructure level)
   * @param userId User identifier
   * @param status Basic presence status (online or offline)
   * @param _metadata Optional metadata
   */
  public async setPresence(
    userId: string,
    status: "online" | "offline",
    _metadata?: Record<string, unknown>,
  ): Promise<void> {
    const clientIds = this.userConnections.get(userId) || new Set();

    const presence: PresenceInfo = {
      userId,
      status,
      lastSeen: new Date(),
      clientIds: Array.from(clientIds),
    };

    this.userPresence.set(userId, presence);

    // Publish a presence update message to those who need it
    await this.publish(`presence:${userId}`, "presence_update", {
      userId,
      status,
      lastSeen: presence.lastSeen,
    });

    this.logger.debug(`User presence updated: ${userId} is now ${status}`);
  }

  /**
   * Get basic presence data for a user (infrastructure level)
   * @param userId User identifier
   * @returns Basic presence data or null if not found
   */
  public async getPresence(userId: string): Promise<PresenceInfo | null> {
    return this.userPresence.get(userId) || null;
  }

  /**
   * Authenticate a client
   * @param clientId Client identifier
   * @param userId User identifier
   * @param metadata Optional metadata about the client
   * @returns Whether authentication was successful
   */
  public async authenticateClient(
    clientId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client) {
      this.logger.warn(`Cannot authenticate: Client not found: ${clientId}`);
      return false;
    }

    // Update client with user information
    client.userId = userId;
    client.authenticated = true;
    client.state = ClientState.AUTHORIZED;
    client.lastActivity = new Date();

    if (metadata) {
      client.metadata = { ...client.metadata, ...metadata };
    }

    // Add client to user connections
    let userClients = this.userConnections.get(userId);
    if (!userClients) {
      userClients = new Set();
      this.userConnections.set(userId, userClients);
    }
    userClients.add(clientId);

    // Set initial presence if not already set
    if (!this.userPresence.has(userId)) {
      await this.setPresence(userId, "online");
    }

    // Notify the client of successful auth
    await this.sendToClient(clientId, "auth_result", {
      success: true,
      userId,
    });

    this.logger.debug(`Client ${clientId} authenticated as user ${userId}`);
    return true;
  }

  /**
   * Disconnect a specific client
   * @param clientId Client identifier
   * @param reason Reason for disconnection
   */
  public disconnectClient(clientId: string, reason?: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Send disconnect message if possible
    try {
      this.sendMessage(client.ws, {
        type: "system",
        eventType: "disconnect",
        data: { reason },
      });

      // Close the WebSocket connection
      client.ws.close();
    } catch (_error) {
      // Ignore errors during disconnect
    }

    // Clean up client resources
    this.handleClientDisconnect(clientId);

    this.logger.debug(
      `Disconnected client ${clientId}: ${reason || "No reason provided"}`,
    );
  }

  /**
   * Get connection statistics
   * @returns Connection statistics
   */
  public getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    channelCounts: Record<string, number>;
    messagesPerSecond: number;
    peakConnections: number;
  } {
    // Calculate messages per second
    const now = Date.now();
    const elapsed = (now - this.messageCountStartTime) / 1000; // in seconds
    const messagesPerSecond = elapsed > 0 ? this.messageCount / elapsed : 0;

    // If more than a minute has passed, reset the counter
    if (elapsed > 60) {
      this.messageCount = 0;
      this.messageCountStartTime = now;
    }

    // Count authenticated connections
    let authenticatedCount = 0;
    for (const client of this.clients.values()) {
      if (client.authenticated) {
        authenticatedCount++;
      }
    }

    // Get channel subscription counts
    const channelCounts: Record<string, number> = {};
    for (const [channel, subscribers] of this.channels.entries()) {
      channelCounts[channel] = subscribers.size;
    }

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedCount,
      channelCounts,
      messagesPerSecond,
      peakConnections: this.peakConnections,
    };
  }

  /**
   * Track peak connection count
   */
  private updatePeakConnections(): void {
    if (this.clients.size > this.peakConnections) {
      this.peakConnections = this.clients.size;
    }
  }
}
