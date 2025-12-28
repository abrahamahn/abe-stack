import { inject, injectable } from "inversify";

import TYPES from "@/server/infrastructure/di/types";
import { generateCorrelationId } from "@/server/infrastructure/errors";
import { ILoggerService } from "@/server/infrastructure/logging";
import { IWebSocketService } from "@/server/infrastructure/pubsub/IWebSocketService";

import {
  IMessagingService,
  Message,
  MessageDeliveryOptions,
  MessageHandler,
} from "./IMessagingService";

/**
 * Implementation of the messaging service
 */
@injectable()
class MessagingService implements IMessagingService {
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private initialized = false;
  private readonly logger: ILoggerService;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService
  ) {
    this.logger = loggerService.createLogger("MessagingService");
  }

  /**
   * Initialize the messaging service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info("Initializing messaging service");

      // Initialize the underlying websocket service
      await this.webSocketService.initialize();

      // Register message handler to route messages to specific handlers
      this.webSocketService.onMessage(this.handleIncomingMessage.bind(this));

      this.initialized = true;
      this.logger.info("Messaging service initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize messaging service", {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Handle incoming messages and route to appropriate handlers
   */
  private async handleIncomingMessage(
    message: { type: string; data: unknown; id?: string },
    userId: string,
    clientId: string
  ): Promise<void> {
    const { type } = message;
    const correlationId = generateCorrelationId();

    try {
      const handler = this.messageHandlers.get(type);

      if (handler) {
        await handler(message as Message, userId, clientId);
      } else {
        this.logger.debug(`No handler registered for message type: ${type}`, {
          userId,
          clientId,
          correlationId,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling message of type: ${type}`, {
        error,
        userId,
        clientId,
        correlationId,
      });
    }
  }

  /**
   * Subscribe a user to a channel
   */
  async subscribeToChannel(userId: string, channel: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.webSocketService.subscribeToChannel(userId, channel);
      this.logger.debug(`User ${userId} subscribed to channel: ${channel}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe user ${userId} to channel ${channel}`,
        {
          error,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Unsubscribe a user from a channel
   */
  async unsubscribeFromChannel(userId: string, channel: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.webSocketService.unsubscribeFromChannel(userId, channel);
      this.logger.debug(`User ${userId} unsubscribed from channel: ${channel}`);
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId} from channel ${channel}`,
        {
          error,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Send a message to a user
   */
  async sendToUser(
    userId: string,
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.webSocketService.sendToUser(
        userId,
        messageType,
        data,
        options
      );
    } catch (error) {
      this.logger.error(`Failed to send message to user ${userId}`, {
        error,
        messageType,
        correlationId: options?.correlationId || generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Send a message to all users in a channel
   */
  async sendToChannel(
    channel: string,
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions & { senderUserId?: string }
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.webSocketService.sendToChannel(
        channel,
        messageType,
        data,
        options
      );
    } catch (error) {
      this.logger.error(`Failed to send message to channel ${channel}`, {
        error,
        messageType,
        correlationId: options?.correlationId || generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Send a message to all connected users
   */
  async broadcast(
    messageType: string,
    data: unknown,
    options?: MessageDeliveryOptions & { senderUserId?: string }
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.webSocketService.broadcast(messageType, data, options);
    } catch (error) {
      this.logger.error(`Failed to broadcast message`, {
        error,
        messageType,
        correlationId: options?.correlationId || generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Register a message handler for a specific message type
   */
  registerMessageHandler(messageType: string, handler: MessageHandler): void {
    this.messageHandlers.set(messageType, handler);
    this.logger.debug(`Registered message handler for type: ${messageType}`);
  }

  /**
   * Unregister a message handler for a specific message type
   */
  unregisterMessageHandler(messageType: string): void {
    this.messageHandlers.delete(messageType);
    this.logger.debug(`Unregistered message handler for type: ${messageType}`);
  }

  /**
   * Get the number of connected clients
   */
  getConnectedClientCount(): number {
    return this.webSocketService.getConnectedClientCount();
  }

  /**
   * Get channels a user is subscribed to
   */
  getUserSubscriptions(userId: string): string[] {
    return this.webSocketService.getUserSubscriptions(userId);
  }

  /**
   * Close the messaging service
   */
  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      this.logger.info("Closing messaging service");
      await this.webSocketService.close();
      this.messageHandlers.clear();
      this.initialized = false;
      this.logger.info("Messaging service closed successfully");
    } catch (error) {
      this.logger.error("Error closing messaging service", {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Ensure the messaging service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export default MessagingService;
