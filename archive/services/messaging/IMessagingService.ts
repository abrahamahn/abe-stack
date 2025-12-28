/**
 * Message format for real-time messaging
 */
export interface Message {
  type: string;
  data: unknown;
  id?: string;
  timestamp?: number;
  correlationId?: string;
}

/**
 * Message delivery options
 */
export interface MessageDeliveryOptions {
  /**
   * Whether to require acknowledgment
   */
  requireAck?: boolean;

  /**
   * Timeout for acknowledgment in milliseconds
   */
  ackTimeout?: number;

  /**
   * Number of retry attempts for unacknowledged messages
   */
  maxRetries?: number;

  /**
   * Correlation ID for tracking
   */
  correlationId?: string;

  /**
   * Whether to exclude sender from recipients
   */
  excludeSender?: boolean;
}

/**
 * Subscription handler function type
 */
export type MessageHandler = (
  message: Message,
  userId: string,
  clientId: string
) => Promise<void>;

/**
 * Messaging service interface for real-time communication
 */
export interface IMessagingService {
  /**
   * Initialize the messaging service
   */
  initialize(): Promise<void>;

  /**
   * Subscribe a user to a channel
   */
  subscribeToChannel(userId: string, channel: string): Promise<void>;

  /**
   * Unsubscribe a user from a channel
   */
  unsubscribeFromChannel(userId: string, channel: string): Promise<void>;

  /**
   * Send a message to a user
   */
  sendToUser(
    userId: string,
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions
  ): Promise<void>;

  /**
   * Send a message to all users in a channel
   */
  sendToChannel(
    channel: string,
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions & { senderUserId?: string }
  ): Promise<void>;

  /**
   * Send a message to all connected users
   */
  broadcast(
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions & { senderUserId?: string }
  ): Promise<void>;

  /**
   * Register a message handler for a specific message type
   */
  registerMessageHandler(messageType: string, handler: MessageHandler): void;

  /**
   * Unregister a message handler for a specific message type
   */
  unregisterMessageHandler(messageType: string): void;

  /**
   * Get the number of connected clients
   */
  getConnectedClientCount(): number;

  /**
   * Get channels a user is subscribed to
   */
  getUserSubscriptions(userId: string): string[];

  /**
   * Close the messaging service
   */
  close(): Promise<void>;
}
