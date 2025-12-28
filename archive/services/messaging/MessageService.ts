import {
  Message,
  MessageType,
  MessageStatus,
  MessageAttachment,
} from "@/server/database/models/messaging/Message";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import { NotificationType } from "@/server/database/models/social/Notification";
import { ConversationRepository } from "@/server/database/repositories/messaging/ConversationRepository";
import { MessageRepository } from "@/server/database/repositories/messaging/MessageRepository";
import { CacheService } from "@/server/infrastructure/cache";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";
import { NotificationService } from "@/server/services/social/notification/NotificationService";

// Constants
const MESSAGE_CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = "message:";
const MAX_MESSAGE_LENGTH = 5000;
const MAX_REACTIONS_PER_MESSAGE = 50;
const MAX_EDIT_HISTORY_LENGTH = 10;

export interface MessageCreateDTO {
  content: string;
  type: MessageType;
  replyToId?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
}

export interface MessageUpdateDTO {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MessageQueryOptions extends PaginationOptions {
  startDate?: Date;
  endDate?: Date;
  type?: MessageType;
  includeDeleted?: boolean;
}

export interface MessageReactionDTO {
  emoji: string;
}

export interface MessageEditRecord {
  timestamp: Date;
  content: string;
  editedBy: string;
}

export interface MessageDeliveryInfo {
  status: MessageStatus;
  deliveredAt?: Date;
  readAt?: Date;
  clientInfo?: string;
}

/**
 * Service responsible for handling messaging operations.
 * Features:
 * 1. Message sending and receiving
 * 2. Message status tracking
 * 3. Message search and filtering
 * 4. Media attachments in messages
 * 5. Message encryption support
 * 6. Message retention policies
 * 7. Message reactions
 * 8. Edit history tracking
 * 9. Enhanced delivery status
 */
export class MessageService extends BaseService {
  constructor(
    private messageRepository: MessageRepository,
    private conversationRepository: ConversationRepository,
    private notificationService: NotificationService,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("MessageService");
  }

  /**
   * Send a new message
   *
   * @param userId - ID of the user sending the message
   * @param conversationId - ID of the conversation
   * @param data - Message data
   * @returns Newly created message
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    data: MessageCreateDTO
  ): Promise<Message> {
    try {
      // Validate message content
      this.validateMessageContent(data.content);

      // Check if conversation is read-only
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }
      if (conversation.isReadOnly && userId !== conversation.creatorId) {
        throw new ValidationError("This conversation is read-only");
      }

      // Create message
      const message = await this.messageRepository.send({
        conversationId,
        senderId: userId,
        content: data.content,
        type: data.type,
        status: MessageStatus.SENT,
        replyToId: data.replyToId,
        metadata: {
          ...data.metadata,
          reactions: {},
          editHistory: [],
          encryptionInfo: conversation.isEncrypted
            ? { enabled: true }
            : undefined,
          deliveryInfo: {
            initialStatus: MessageStatus.SENT,
            timestamp: new Date(),
          },
        },
        attachments: data.attachments || [],
        readBy: [userId],
        isEdited: false,
        editedAt: null,
        deletedForUserIds: [],
        sentAt: new Date(),
      });

      // Update conversation's last message and timestamp
      await this.conversationRepository.update(conversationId, {
        lastMessageId: message.id,
        lastMessageSentAt: message.sentAt,
      });

      // Send notifications to other participants
      if (conversation) {
        const participants = conversation.participantIds.filter(
          (p) => p !== userId
        );
        await Promise.all(
          participants.map((participantId) =>
            this.notificationService.createNotification({
              type: NotificationType.MESSAGE,
              userId: participantId,
              actorId: userId,
              metadata: {
                entityId: message.id,
                entityType: EntityType.MESSAGE,
                content: message.content,
              },
            })
          )
        );
      }

      // Track metrics
      this.metricsService.recordOperationDuration("message_send", 1);

      return message;
    } catch (error) {
      this.logger.error("Error sending message", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get message by ID
   *
   * @param messageId - ID of the message to retrieve
   * @param userId - ID of the user requesting the message
   * @returns Message if found and accessible, null otherwise
   */
  async getMessage(messageId: string, userId: string): Promise<Message | null> {
    try {
      // Try to get from cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      const cachedMessage = await this.cacheService.get<Message>(cacheKey);
      if (cachedMessage) {
        if (!cachedMessage.deletedForUserIds.includes(userId)) {
          return cachedMessage;
        }
        return null;
      }

      // Get from repository
      const message = await this.messageRepository.findById(messageId);
      if (!message || message.deletedForUserIds.includes(userId)) {
        return null;
      }

      // Cache the result
      await this.cacheService.set(cacheKey, message, MESSAGE_CACHE_TTL);

      return message;
    } catch (error) {
      this.logger.error("Error getting message", {
        messageId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update message content
   *
   * @param userId - ID of the user updating the message
   * @param messageId - ID of the message to update
   * @param updates - Update data
   * @returns Updated message
   */
  async updateMessage(
    userId: string,
    messageId: string,
    updates: MessageUpdateDTO
  ): Promise<Message> {
    try {
      // Validate content
      this.validateMessageContent(updates.content);

      // Get the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Verify ownership
      if (message.senderId !== userId) {
        throw new ValidationError("You can only edit your own messages");
      }

      // Check if conversation is read-only
      const conversation = await this.conversationRepository.findById(
        message.conversationId
      );
      if (conversation?.isReadOnly && userId !== conversation.creatorId) {
        throw new ValidationError("This conversation is read-only");
      }

      // Store edit history
      const editHistory = message.metadata?.editHistory || [];
      if (
        Array.isArray(editHistory) &&
        editHistory.length < MAX_EDIT_HISTORY_LENGTH
      ) {
        editHistory.push({
          timestamp: new Date(),
          content: message.content,
          editedBy: userId,
        });
      }

      const updatedMetadata = {
        ...message.metadata,
        editHistory,
        ...(updates.metadata || {}),
      };

      // Update message
      const updatedMessage = await this.messageRepository.update(messageId, {
        content: updates.content,
        isEdited: true,
        editedAt: new Date(),
        metadata: updatedMetadata,
      });

      if (!updatedMessage) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);

      return updatedMessage;
    } catch (error) {
      this.logger.error("Error updating message", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete message for a user
   *
   * @param userId - ID of the user deleting the message
   * @param messageId - ID of the message to delete
   * @returns true if deleted, false if not found
   */
  async deleteMessage(userId: string, messageId: string): Promise<boolean> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return false;
      }

      // Add user to deletedForUserIds
      message.deletedForUserIds.push(userId);
      await this.messageRepository.update(messageId, {
        deletedForUserIds: message.deletedForUserIds,
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);

      return true;
    } catch (error) {
      this.logger.error("Error deleting message", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete message for all users (admin only)
   *
   * @param userId - ID of the admin deleting the message
   * @param messageId - ID of the message to delete
   * @returns true if deleted, false if not found or not authorized
   */
  async deleteMessageForAll(
    userId: string,
    messageId: string
  ): Promise<boolean> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return false;
      }

      // Get conversation to check permissions
      const conversation = await this.conversationRepository.findById(
        message.conversationId
      );
      if (!conversation) {
        return false;
      }

      // Only admin or message sender can delete for all
      if (conversation.creatorId !== userId && message.senderId !== userId) {
        throw new ValidationError(
          "Only the conversation admin or message sender can delete messages for all"
        );
      }

      // Delete message
      await this.messageRepository.delete(messageId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);

      return true;
    } catch (error) {
      this.logger.error("Error deleting message for all", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add reaction to a message
   *
   * @param userId - ID of the user adding the reaction
   * @param messageId - ID of the message
   * @param reaction - Reaction data
   */
  async addReaction(
    userId: string,
    messageId: string,
    reaction: MessageReactionDTO
  ): Promise<void> {
    try {
      // Validate emoji
      if (!reaction.emoji || !this.isValidEmoji(reaction.emoji)) {
        throw new ValidationError("Invalid emoji format");
      }

      // Get message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Check if conversation is read-only
      const conversation = await this.conversationRepository.findById(
        message.conversationId
      );
      if (conversation?.isReadOnly && userId !== conversation.creatorId) {
        throw new ValidationError("This conversation is read-only");
      }

      // Initialize reactions object if it doesn't exist
      const reactions: Record<string, string[]> =
        (message.metadata?.reactions as Record<string, string[]>) || {};

      // Check for reaction limit
      const totalReactions = Object.values(reactions).reduce(
        (sum, users) => sum + users.length,
        0
      );
      if (totalReactions >= MAX_REACTIONS_PER_MESSAGE) {
        throw new ValidationError(
          `Maximum of ${MAX_REACTIONS_PER_MESSAGE} reactions per message`
        );
      }

      // Add reaction
      const emojiReactions = reactions[reaction.emoji] || [];
      if (!emojiReactions.includes(userId)) {
        emojiReactions.push(userId);
      }
      reactions[reaction.emoji] = emojiReactions;

      // Update message
      await this.messageRepository.update(messageId, {
        metadata: {
          ...message.metadata,
          reactions,
        },
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error adding reaction", {
        userId,
        messageId,
        reaction,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   *
   * @param userId - ID of the user removing the reaction
   * @param messageId - ID of the message
   * @param emoji - Emoji to remove
   */
  async removeReaction(
    userId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    try {
      // Get message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Check if reaction exists
      const reactions: Record<string, string[]> =
        (message.metadata?.reactions as Record<string, string[]>) || {};
      const emojiReactions = reactions[emoji] || [];

      // Remove user from reactions
      const updatedReactions = emojiReactions.filter(
        (id: string) => id !== userId
      );

      // If no users left for this emoji, remove the emoji key
      if (updatedReactions.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = updatedReactions;
      }

      // Update message
      await this.messageRepository.update(messageId, {
        metadata: {
          ...message.metadata,
          reactions,
        },
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error removing reaction", {
        userId,
        messageId,
        emoji,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   *
   * @param userId - ID of the user marking the message
   * @param messageId - ID of the message to mark
   * @param clientInfo - Optional client information
   */
  async markAsRead(
    userId: string,
    messageId: string,
    clientInfo?: string
  ): Promise<void> {
    try {
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);

        // Update delivery info in metadata
        const metadata = message.metadata || {};

        // Add this user's read receipt
        const userDeliveryInfo: MessageDeliveryInfo = {
          status: MessageStatus.READ,
          readAt: new Date(),
          clientInfo,
        };

        if (!metadata.deliveryInfo) {
          metadata.deliveryInfo = { [userId]: userDeliveryInfo };
        } else {
          (metadata.deliveryInfo as Record<string, MessageDeliveryInfo>)[
            userId
          ] = userDeliveryInfo;
        }

        await this.messageRepository.update(messageId, {
          readBy: message.readBy,
          status: MessageStatus.READ,
          metadata,
        });

        // Invalidate cache
        const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
        await this.cacheService.delete(cacheKey);
      }
    } catch (error) {
      this.logger.error("Error marking message as read", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark multiple messages as read
   *
   * @param userId - ID of the user marking the messages
   * @param messageIds - IDs of the messages to mark
   * @param clientInfo - Optional client information
   */
  async markMultipleAsRead(
    userId: string,
    messageIds: string[],
    clientInfo?: string
  ): Promise<void> {
    try {
      if (messageIds.length === 0) {
        return;
      }

      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map((messageId) =>
            this.markAsRead(userId, messageId, clientInfo)
          )
        );
      }

      // Track metrics
      this.metricsService.recordOperationDuration(
        "message_batch_read",
        messageIds.length
      );
    } catch (error) {
      this.logger.error("Error marking multiple messages as read", {
        userId,
        messageCount: messageIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read
   *
   * @param userId - ID of the user marking messages
   * @param conversationId - ID of the conversation
   * @param clientInfo - Optional client information
   */
  async markConversationAsRead(
    userId: string,
    conversationId: string,
    clientInfo?: string
  ): Promise<void> {
    try {
      // Verify user is in conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation || !conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "User is not a participant in this conversation"
        );
      }

      // Get unread messages
      const allMessages = await this.messageRepository.findByConversationId(
        conversationId,
        1000, // Use a large limit to get most messages
        undefined
      );

      // Filter for user access and calculate total
      const accessibleMessages = allMessages.filter(
        (m) => !m.deletedForUserIds.includes(userId)
      );

      // Filter to find unread messages
      const messages = accessibleMessages.filter(
        (m) => !m.readBy.includes(userId)
      );

      // Mark all as read
      await this.markMultipleAsRead(
        userId,
        messages.map((m) => m.id),
        clientInfo
      );
    } catch (error) {
      this.logger.error("Error marking conversation as read", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get messages from a conversation
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user requesting messages
   * @param options - Query options
   * @returns Paginated message results
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    options: MessageQueryOptions
  ): Promise<PaginatedResult<Message>> {
    try {
      // Verify user is in conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation || !conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "User is not a participant in this conversation"
        );
      }

      // Get total count - using available methods instead of countByConversation
      const allMessages = await this.messageRepository.findByConversationId(
        conversationId,
        1000, // Use a large limit to get most messages
        undefined
      );

      // Filter for user access and calculate total
      const accessibleMessages = allMessages.filter(
        (m) => !m.deletedForUserIds.includes(userId) || options.includeDeleted
      );
      const totalCount = accessibleMessages.length;

      // Get messages
      const messages = await this.messageRepository.findByConversationId(
        conversationId,
        options.limit || 20,
        options.startDate
      );

      // Apply filters manually
      const filteredMessages = messages.filter(
        (m) => !m.deletedForUserIds.includes(userId) || options.includeDeleted
      );

      // Track metrics
      this.metricsService.recordOperationDuration("message_retrieval", 1);

      return {
        items: filteredMessages,
        total: totalCount,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(totalCount / (options.limit || 20)),
      };
    } catch (error) {
      this.logger.error("Error getting conversation messages", {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search messages
   *
   * @param userId - ID of the user searching messages
   * @param query - Search query
   * @param options - Query options
   * @returns Paginated message results
   */
  async searchMessages(
    userId: string,
    query: string,
    options: MessageQueryOptions
  ): Promise<PaginatedResult<Message>> {
    try {
      // Instead of using non-existent search methods, use findByConversationId and filter manually
      const allConversations =
        await this.conversationRepository.findByUserId(userId);
      let allMessages: Message[] = [];

      // Get messages from all conversations
      await Promise.all(
        allConversations.map(async (conversation) => {
          const messages = await this.messageRepository.findByConversationId(
            conversation.id,
            1000, // Use large limit
            options.startDate
          );
          allMessages = [...allMessages, ...messages];
        })
      );

      // Apply search filtering manually
      const searchResults = allMessages.filter((message) => {
        // Filter by date range if specified
        if (options.startDate && message.sentAt < options.startDate)
          return false;
        if (options.endDate && message.sentAt > options.endDate) return false;

        // Filter by type if specified
        if (options.type && message.type !== options.type) return false;

        // Filter by query (search in content)
        if (
          query &&
          !message.content.toLowerCase().includes(query.toLowerCase())
        )
          return false;

        // Filter out deleted messages unless includeDeleted is true
        if (
          message.deletedForUserIds.includes(userId) &&
          !options.includeDeleted
        )
          return false;

        return true;
      });

      // Calculate pagination
      const totalCount = searchResults.length;
      const startIndex = options.page
        ? (options.page - 1) * (options.limit || 20)
        : 0;
      const paginatedMessages = searchResults
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()) // Sort by most recent
        .slice(startIndex, startIndex + (options.limit || 20));

      return {
        items: paginatedMessages,
        total: totalCount,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(totalCount / (options.limit || 20)),
      };
    } catch (error) {
      this.logger.error("Error searching messages", {
        userId,
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set encryption for a message
   *
   * @param userId - ID of the user setting encryption
   * @param messageId - ID of the message
   * @param encryptionInfo - Encryption information
   */
  async setEncryption(
    userId: string,
    messageId: string,
    encryptionInfo: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Verify ownership
      if (message.senderId !== userId) {
        throw new ValidationError("Only the sender can set encryption info");
      }

      // Update message
      await this.messageRepository.update(messageId, {
        metadata: {
          ...message.metadata,
          encryptionInfo: {
            ...((message.metadata?.encryptionInfo as Record<string, unknown>) ||
              {}),
            ...encryptionInfo,
            enabled: true,
          },
        },
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${messageId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error setting encryption", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get message edit history
   *
   * @param userId - ID of the user requesting history
   * @param messageId - ID of the message
   * @returns Array of edit records
   */
  async getEditHistory(
    userId: string,
    messageId: string
  ): Promise<MessageEditRecord[]> {
    try {
      // Get message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Verify user is in the conversation
      const conversation = await this.conversationRepository.findById(
        message.conversationId
      );
      if (!conversation?.participantIds.includes(userId)) {
        throw new ValidationError("You don't have access to this message");
      }

      // Return edit history
      return (message.metadata?.editHistory || []) as MessageEditRecord[];
    } catch (error) {
      this.logger.error("Error getting edit history", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get message delivery status
   *
   * @param userId - ID of the user requesting status
   * @param messageId - ID of the message
   * @returns Object mapping user IDs to delivery info
   */
  async getDeliveryStatus(
    userId: string,
    messageId: string
  ): Promise<Record<string, MessageDeliveryInfo>> {
    try {
      // Get message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        throw new ResourceNotFoundError("Message", messageId);
      }

      // Verify user is in the conversation
      const conversation = await this.conversationRepository.findById(
        message.conversationId
      );
      if (!conversation?.participantIds.includes(userId)) {
        throw new ValidationError("You don't have access to this message");
      }

      // Return delivery info
      return (message.metadata?.deliveryInfo || {}) as Record<
        string,
        MessageDeliveryInfo
      >;
    } catch (error) {
      this.logger.error("Error getting delivery status", {
        userId,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate message content
   *
   * @param content - Message content to validate
   * @throws ValidationError if content is invalid
   */
  private validateMessageContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new ValidationError("Message content cannot be empty");
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(
        `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters`
      );
    }
  }

  /**
   * Check if emoji is valid
   *
   * @param emoji - Emoji to validate
   * @returns Whether emoji is valid
   */
  private isValidEmoji(emoji: string): boolean {
    // Simple check for emoji-like strings
    return (
      emoji.length <= 10 &&
      /(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Modifier_Base}|\p{Emoji_Component})/u.test(
        emoji
      )
    );
  }
}
