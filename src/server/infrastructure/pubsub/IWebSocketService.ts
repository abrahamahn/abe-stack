import { Server as HttpServer } from "http";

import { WebSocket } from "ws";

/**
 * Authentication options for WebSocket connections
 */
export interface WebSocketAuthOptions {
  /**
   * Whether authentication is required for connecting
   */
  required: boolean;

  /**
   * Function to validate an authentication token
   */
  validateToken?: (token: string) => Promise<string | null>; // Returns userId if valid

  /**
   * Custom authentication handler
   */
  authHandler?: (request: {
    headers: Record<string, string | string[]>;
    url: string;
  }) => Promise<{
    authenticated: boolean;
    userId?: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Time in milliseconds before unauthenticated connections are closed
   * @default 10000 (10 seconds)
   */
  authTimeout?: number;
}

/**
 * Options for WebSocket messages
 */
export interface WebSocketMessageOptions {
  /**
   * Whether message delivery confirmation is required
   */
  requireAck?: boolean;

  /**
   * Message ID for tracking and acknowledgment
   */
  messageId?: string;

  /**
   * Timeout in milliseconds for acknowledgment
   */
  ackTimeout?: number;

  /**
   * Whether to exclude the sender from receiving the message
   */
  excludeSender?: boolean;
}

/**
 * Client connection state
 */
export enum ClientState {
  /**
   * Initial connection state
   */
  CONNECTING = "connecting",

  /**
   * Connected but not authenticated
   */
  CONNECTED = "connected",

  /**
   * Connection authorized
   */
  AUTHORIZED = "authorized",

  /**
   * Connection closed
   */
  CLOSED = "closed",
}

/**
 * Basic presence information
 * Infrastructure-level presence data, application-specific presence should be in the service layer
 */
export interface PresenceInfo {
  /**
   * User identifier
   */
  userId: string;

  /**
   * Basic presence status
   */
  status: "online" | "offline";

  /**
   * Last activity timestamp
   */
  lastSeen?: Date;

  /**
   * Associated client IDs
   */
  clientIds: string[];
}

/**
 * WebSocket client information
 */
export interface WebSocketClient {
  /**
   * Unique client identifier
   */
  id: string;

  /**
   * WebSocket instance
   */
  ws: WebSocket | import("ws").WebSocket;

  /**
   * Associated user identifier (if authenticated)
   */
  userId?: string;

  /**
   * Whether the client is authenticated
   */
  authenticated: boolean;

  /**
   * Current connection state
   */
  state: ClientState;

  /**
   * Time when the connection was established
   */
  connectedAt: Date;

  /**
   * Time of last activity
   */
  lastActivity: Date;

  /**
   * Client metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket service interface for real-time communication
 * Core infrastructure interface with no application-specific logic
 */
export interface IWebSocketService {
  /**
   * Initialize the WebSocket server
   * @param server HTTP server instance
   * @param options Authentication options
   */
  initialize(server: HttpServer, options?: WebSocketAuthOptions): void;

  /**
   * Close all connections and stop the WebSocket server
   */
  close(): void;

  /**
   * Send a message to a specific client
   * @param clientId Client identifier
   * @param eventType Event type
   * @param data Message data
   * @param options Message options
   * @returns Whether the message was sent successfully
   */
  sendToClient(
    clientId: string,
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<boolean>;

  /**
   * Publish a message to a channel
   * @param channel Channel name
   * @param eventType Event type
   * @param data Message data
   * @param options Message options
   * @returns Number of clients the message was sent to
   */
  publish(
    channel: string,
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<number>;

  /**
   * Broadcast a message to all connected clients
   * @param eventType Event type
   * @param data Message data
   * @param options Message options
   * @returns Number of clients the message was sent to
   */
  broadcast(
    eventType: string,
    data: unknown,
    options?: WebSocketMessageOptions,
  ): Promise<number>;

  /**
   * Subscribe a client to a channel
   * @param clientId Client identifier
   * @param channel Channel name
   * @returns Whether the subscription was successful
   */
  subscribe(clientId: string, channel: string): boolean;

  /**
   * Unsubscribe a client from a channel
   * @param clientId Client identifier
   * @param channel Channel name
   * @returns Whether the unsubscription was successful
   */
  unsubscribe(clientId: string, channel: string): boolean;

  /**
   * Get the channels a client is subscribed to
   * @param clientId Client identifier
   * @returns Set of channel names
   */
  getClientChannels(clientId: string): Set<string>;

  /**
   * Get all clients subscribed to a channel
   * @param channel Channel name
   * @returns Set of client identifiers
   */
  getChannelClients(channel: string): Set<string>;

  /**
   * Authenticate a client
   * @param clientId Client identifier
   * @param userId User identifier
   * @param metadata Optional metadata about the client
   * @returns Whether authentication was successful
   */
  authenticateClient(
    clientId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * Set basic presence data for a user (infrastructure level)
   * @param userId User identifier
   * @param status Basic presence status
   * @param metadata Optional metadata
   */
  setPresence(
    userId: string,
    status: "online" | "offline",
    metadata?: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Get basic presence data for a user (infrastructure level)
   * @param userId User identifier
   * @returns Basic presence data or null if not found
   */
  getPresence(userId: string): Promise<PresenceInfo | null>;

  /**
   * Disconnect a specific client
   * @param clientId Client identifier
   * @param reason Reason for disconnection
   */
  disconnectClient(clientId: string, reason?: string): void;

  /**
   * Get connection statistics
   * @returns Connection statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    channelCounts: Record<string, number>;
    messagesPerSecond: number;
    peakConnections: number;
  };
}
