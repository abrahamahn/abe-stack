import { injectable, inject } from "inversify";

import { BaseModelInterface } from "@/server/database/models/BaseModel";
import { ParticipantRole } from "@/server/database/models/messaging/Conversation";
import {
  Message,
  MessageAttributes,
  MessageStatus,
  MessageType,
} from "@/server/database/models/messaging/Message";
import { IDatabaseServer } from "@/server/infrastructure";
import TYPES from "@/server/infrastructure/di/types";
import {
  MessageNotFoundError,
  MessageValidationError,
  MessagePermissionError,
  MessageStatusError,
  MessageOperationError,
  MessageDeletedError,
} from "@/server/infrastructure/errors/domain/messaging/MessageError";
import { ILoggerService } from "@/server/infrastructure/logging";

import { BaseRepository } from "../BaseRepository";
import {
  ConversationNotFoundError,
  conversationRepository,
} from "./ConversationRepository";

// Add custom interface to fix the type constraint error
export interface MessageWithIndex extends Message, BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Repository class for handling Message database operations
 * This class is responsible for:
 * 1. All database operations related to messages
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for messages
 * 4. Throwing domain-specific errors for error cases
 * 5. NOT implementing business logic - that belongs in the Message model
 */
@injectable()
export class MessageRepository extends BaseRepository<Message> {
  protected tableName = "messages";
  protected columns = [
    "id",
    "conversation_id as conversationId",
    "sender_id as senderId",
    "content",
    "type",
    "status",
    "metadata",
    "read_by as readBy",
    "is_edited as isEdited",
    "edited_at as editedAt",
    "attachments",
    "deleted_for_user_ids as deletedForUserIds",
    "sent_at as sentAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseService) private databaseService: IDatabaseServer
  ) {
    super("Message");
  }

  /**
   * Send a new message
   */
  async send(
    data: Omit<MessageAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<Message> {
    return this.withTransaction(async (_client) => {
      try {
        // First validate the message
        const message = new Message({
          ...data,
          conversationId: data.conversationId as string,
          senderId: data.senderId as string,
          content: data.content as string,
        }) as MessageWithIndex;

        message.validate();

        // Check if conversation exists
        const conversation = await conversationRepository.findById(
          data.conversationId as string
        );
        if (!conversation) {
          throw new ConversationNotFoundError(data.conversationId as string);
        }

        // Check if user is a participant in the conversation
        if (!conversation.hasParticipant(data.senderId as string)) {
          throw new MessagePermissionError(
            "User is not a participant in this conversation"
          );
        }

        // Check if conversation is read-only
        if (conversation.isReadOnly) {
          throw new MessagePermissionError(
            "Cannot send messages to a read-only conversation"
          );
        }

        // Create the message
        const result = await super.create(message);
        const newMessage = this.mapResultToModel(
          result as Record<string, unknown>
        );

        // Update conversation's last message
        await conversationRepository.updateLastMessage(
          data.conversationId as string,
          newMessage.id,
          newMessage.createdAt
        );

        return new Message({
          ...result,
          conversationId: result.conversationId,
          senderId: result.senderId,
          content: result.content,
        });
      } catch (error) {
        if (
          error instanceof MessageError ||
          error instanceof ConversationNotFoundError
        ) {
          throw error;
        }
        throw new MessageError("Failed to send message", "SEND_ERROR");
      }
    });
  }

  /**
   * Find messages for a conversation with pagination
   */
  async findByConversationId(
    conversationId: string,
    limit = 50,
    before?: Date,
    userId?: string
  ): Promise<Message[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE conversation_id = $1
      `;

      const params: unknown[] = [conversationId];

      // Filter by date if provided
      if (before) {
        query += ` AND created_at < $${params.length + 1}`;
        params.push(before);
      }

      // If userId is provided, exclude messages deleted for that user
      if (userId) {
        query += ` AND NOT (deleted_for_user_ids @> ARRAY[$${params.length + 1}]::uuid[])`;
        params.push(userId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit.toString());

      const { rows } = await this.databaseService.query(query, params);
      return rows.map((row) => new Message(this.processMessageData(row)));
    } catch (error) {
      throw new MessageOperationError("findByConversationId", error);
    }
  }

  /**
   * Find a single message by ID
   */
  async findById(id: string): Promise<MessageWithIndex | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const { rows } = await this.databaseService.query(query, [id]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0] as Record<string, unknown>);
    } catch (error) {
      throw new MessageOperationError("findById", error);
    }
  }

  /**
   * Find a message by ID or throw if not found
   * @throws MessageNotFoundError if message not found
   * @throws MessageOperationError if there's an error during the operation
   */
  async findByIdOrThrow(id: string): Promise<MessageWithIndex> {
    const message = await this.findById(id);
    if (!message) {
      throw new MessageNotFoundError(id);
    }
    return message;
  }

  /**
   * Mark message as read by a user
   */
  async markAsReadBy(messageId: string, userId: string): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const message = await this.findById(messageId);
        if (!message) {
          throw new MessageNotFoundError(messageId);
        }

        // Check if already read by this user
        if (message.readBy.includes(userId)) {
          return true; // Already read
        }

        message.markAsReadBy(userId);
        message.markAsRead();

        const result = await super.update(messageId, {
          readBy: message.readBy,
          status: message.status,
        });

        return !!result;
      } catch (error) {
        if (error instanceof MessageError) {
          throw error;
        }
        throw new MessageError(
          "Failed to mark message as read",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Mark all messages in a conversation as read by a user
   */
  async markAllAsReadByUser(
    conversationId: string,
    userId: string
  ): Promise<number> {
    return this.withTransaction(async (_client) => {
      try {
        const query = `
          UPDATE ${this.tableName}
          SET read_by = array_append(read_by, $1),
              status = CASE
                WHEN status = 'SENT' OR status = 'DELIVERED' THEN 'READ'::message_status
                ELSE status
              END,
              updated_at = NOW()
          WHERE conversation_id = $2
            AND sender_id != $1
            AND NOT (read_by @> ARRAY[$1]::uuid[])
          RETURNING id
        `;

        const { rowCount } = await this.databaseService.query(query, [
          userId,
          conversationId,
        ]);
        return rowCount ?? 0;
      } catch (error) {
        throw new MessageError(
          "Failed to mark all messages as read",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<Message> {
    return this.withTransaction(async (_client) => {
      try {
        const message = await this.findById(messageId);
        if (!message) {
          throw new MessageNotFoundError(messageId);
        }

        // Check if user is the sender
        if (message.senderId !== userId) {
          throw new MessagePermissionError(
            "Only the sender can edit a message"
          );
        }

        // Check if message can be edited
        if (message.status === MessageStatus.DELETED) {
          throw new MessageValidationError("Cannot edit a deleted message");
        }

        if (message.type !== MessageType.TEXT) {
          throw new MessageValidationError(
            `Cannot edit a ${message.type} message`
          );
        }

        message.editContent(newContent);

        const result = await super.update(messageId, {
          content: message.content,
          isEdited: message.isEdited,
          editedAt: message.editedAt,
        });

        if (!result) {
          throw new MessageNotFoundError(messageId);
        }

        return new Message({
          ...result,
          conversationId: result.conversationId,
          senderId: result.senderId,
          content: result.content,
        });
      } catch (error) {
        if (error instanceof MessageError) {
          throw error;
        }
        throw new MessageError("Failed to edit message", "UPDATE_ERROR");
      }
    });
  }

  /**
   * Soft delete a message for all users
   */
  async softDelete(messageId: string, userId: string): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const message = await this.findById(messageId);
        if (!message) {
          throw new MessageNotFoundError(messageId);
        }

        // Check if user is the sender or has admin permission
        if (message.senderId !== userId) {
          // Here you would check if user has admin rights in the conversation
          const conversation = await conversationRepository.findById(
            message.conversationId
          );
          if (
            !conversation ||
            !conversation.participantDetails?.some(
              (p) => p.userId === userId && p.role === ParticipantRole.ADMIN
            )
          ) {
            throw new MessagePermissionError(
              "No permission to delete this message"
            );
          }
        }

        message.softDelete();

        const result = await super.update(messageId, {
          status: message.status,
          content: message.content,
          metadata: message.metadata,
        });

        return !!result;
      } catch (error) {
        if (error instanceof MessageError) {
          throw error;
        }
        throw new MessageError("Failed to delete message", "DELETE_ERROR");
      }
    });
  }

  /**
   * Find unread messages count for a user
   */
  async getUnreadCount(
    userId: string
  ): Promise<{ total: number; byConversation: Record<string, number> }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          json_object_agg(conversation_id, count) as by_conversation
        FROM (
          SELECT 
            conversation_id,
            COUNT(*) as count
          FROM ${this.tableName}
          WHERE 
            sender_id != $1
            AND NOT (read_by @> ARRAY[$1]::uuid[])
            AND status != 'DELETED'
            AND EXISTS (
              SELECT 1 FROM conversations 
              WHERE id = conversation_id
              AND participant_ids @> ARRAY[$1]::uuid[]
            )
          GROUP BY conversation_id
        ) counts
      `;

      const { rows } = await this.databaseService.query(query, [userId]);
      const result = (rows[0] as {
        total?: string;
        by_conversation?: Record<string, number>;
      }) || { total: "0", by_conversation: {} };

      return {
        total: parseInt(result.total || "0", 10),
        byConversation: result.by_conversation || {},
      };
    } catch (error) {
      throw new MessageError("Failed to get unread count", "QUERY_ERROR");
    }
  }

  /**
   * Search messages by content
   */
  async searchMessages(
    userId: string,
    searchTerm: string,
    limit = 20,
    offset = 0
  ): Promise<Message[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName} m
        WHERE 
          content ILIKE $1
          AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = m.conversation_id
            AND c.participant_ids @> ARRAY[$2]::uuid[]
          )
          AND status != 'DELETED'
          AND NOT (deleted_for_user_ids @> ARRAY[$2]::uuid[])
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const { rows } = await this.databaseService.query(query, [
        `%${searchTerm}%`,
        userId,
        limit.toString(),
        offset.toString(),
      ]);

      return rows.map((row) => new Message(this.processMessageData(row)));
    } catch (error) {
      throw new MessageError("Failed to search messages", "QUERY_ERROR");
    }
  }

  /**
   * Process message data from database
   */
  private processMessageData(
    data: unknown
  ): MessageAttributes & { senderId: string; content: string } {
    const typedData = data as Record<string, unknown>;

    // Parse readBy if it's a string
    if (typeof typedData.readBy === "string") {
      try {
        typedData.readBy = JSON.parse(typedData.readBy) as string[];
      } catch (error) {
        typedData.readBy = [];
      }
    }

    // Parse metadata if it's a string
    if (typeof typedData.metadata === "string") {
      try {
        typedData.metadata = JSON.parse(typedData.metadata) as Record<
          string,
          unknown
        >;
      } catch (error) {
        typedData.metadata = null;
      }
    }

    // Convert null to empty string for content if needed
    if (typedData.content === null) {
      typedData.content = "";
    }

    return typedData as unknown as MessageAttributes & {
      senderId: string;
      content: string;
    };
  }

  /**
   * Create a new message
   * @throws MessageValidationError if the message data is invalid
   * @throws MessageOperationError if there's an error during the operation
   */
  async create(messageData: Partial<MessageAttributes>): Promise<Message> {
    try {
      // Create a new message object to validate the data
      const message = new Message(messageData);

      // Validate the message data
      const validationErrors = message.validate();
      if (validationErrors.length > 0) {
        throw new MessageValidationError(validationErrors);
      }

      // Prepare the data for insertion
      const data = {
        id: message.id,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        content: message.content,
        type: message.type,
        status: message.status || MessageStatus.SENT,
        metadata: message.metadata || {},
        read_by: message.readBy || [],
        is_edited: message.isEdited || false,
        edited_at: message.editedAt,
        attachments: message.attachments || [],
        deleted_for_user_ids: message.deletedForUserIds || [],
        sent_at: message.sentAt || new Date(),
        created_at: message.createdAt || new Date(),
        updated_at: message.updatedAt || new Date(),
      };

      const columns = Object.keys(data);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const values = Object.values(data);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);
      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (error instanceof MessageValidationError) {
        throw error;
      }
      throw new MessageOperationError("create", error);
    }
  }

  /**
   * Update a message
   * @throws MessageNotFoundError if the message doesn't exist
   * @throws MessagePermissionError if the user doesn't have permission to update the message
   * @throws MessageStatusError if the message has a status that doesn't allow updates
   * @throws MessageValidationError if the updated data is invalid
   * @throws MessageOperationError if there's an error during the operation
   */
  async update(
    id: string,
    updates: Partial<MessageAttributes>,
    userId?: string
  ): Promise<Message> {
    try {
      // First, fetch the existing message
      const existingMessage = await this.findByIdOrThrow(id);

      // Check if user has permission to update the message
      if (userId && existingMessage.senderId !== userId) {
        throw new MessagePermissionError(
          "Only the sender can update this message"
        );
      }

      // Check if message is in a status that allows updates
      if (existingMessage.status === MessageStatus.DELETED) {
        throw new MessageDeletedError(id);
      }

      // Apply updates to the message
      const updatedData = {
        ...existingMessage,
        ...updates,
        isEdited: true,
        editedAt: new Date(),
      };
      const message = new Message(updatedData);

      // Validate the updated message data
      const validationErrors = message.validate();
      if (validationErrors.length > 0) {
        throw new MessageValidationError(validationErrors);
      }

      // Prepare the data for update
      const updateData: Record<string, unknown> = {
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        is_edited: true,
        edited_at: new Date(),
        attachments: message.attachments,
        updated_at: new Date(),
      };

      const setClauses = Object.keys(updateData).map(
        (key, index) => `${key} = $${index + 2}`
      );

      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(", ")}
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const values = [id, ...Object.values(updateData)];
      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new MessageNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (
        error instanceof MessageNotFoundError ||
        error instanceof MessagePermissionError ||
        error instanceof MessageStatusError ||
        error instanceof MessageValidationError ||
        error instanceof MessageDeletedError
      ) {
        throw error;
      }
      throw new MessageOperationError("update", error);
    }
  }

  /**
   * Mark a message as deleted for a specific user
   * @throws MessageNotFoundError if the message doesn't exist
   * @throws MessagePermissionError if user doesn't have permission to delete
   * @throws MessageOperationError if there's an error during the operation
   */
  async markAsDeletedForUser(
    messageId: string,
    userId: string
  ): Promise<Message> {
    try {
      const message = await this.findByIdOrThrow(messageId);

      // If message is already deleted for this user, just return it
      if (message.deletedForUserIds?.includes(userId)) {
        return message;
      }

      // Add userId to deletedForUserIds array
      const deletedForUserIds = [...(message.deletedForUserIds || []), userId];

      const query = `
        UPDATE ${this.tableName}
        SET deleted_for_user_ids = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [
        messageId,
        deletedForUserIds,
      ]);

      if (result.rows.length === 0) {
        throw new MessageNotFoundError(messageId);
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (error instanceof MessageNotFoundError) {
        throw error;
      }
      throw new MessageOperationError("markAsDeletedForUser", error);
    }
  }

  /**
   * Permanently delete a message (admin function)
   * @throws MessageNotFoundError if the message doesn't exist
   * @throws MessagePermissionError if user doesn't have permission
   * @throws MessageOperationError if there's an error during the operation
   */
  async delete(messageId: string, userId?: string): Promise<void> {
    try {
      // If userId is provided, check if user is the sender or has admin rights
      if (userId) {
        const message = await this.findByIdOrThrow(messageId);
        if (message.senderId !== userId) {
          // In a real app, check user's role or permissions here
          throw new MessagePermissionError(
            "Only the sender or an admin can delete this message"
          );
        }
      }

      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [messageId]);

      if (result.rowCount === 0) {
        throw new MessageNotFoundError(messageId);
      }
    } catch (error) {
      if (
        error instanceof MessageNotFoundError ||
        error instanceof MessagePermissionError
      ) {
        throw error;
      }
      throw new MessageOperationError("delete", error);
    }
  }

  /**
   * Mark messages as read for a user
   * @throws MessageOperationError if there's an error during the operation
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    messageIds: string[]
  ): Promise<void> {
    try {
      if (messageIds.length === 0) return;

      // Build placeholders for the message IDs
      const idPlaceholders = messageIds
        .map((_, index) => `$${index + 3}`)
        .join(", ");

      const query = `
        UPDATE ${this.tableName}
        SET read_by = CASE
          WHEN read_by @> ARRAY[$2]::uuid[] THEN read_by
          ELSE array_append(read_by, $2::uuid)
        END,
        updated_at = NOW()
        WHERE conversation_id = $1
        AND id IN (${idPlaceholders})
      `;

      await this.executeQuery(query, [conversationId, userId, ...messageIds]);
    } catch (error) {
      throw new MessageOperationError("markAsRead", error);
    }
  }

  /**
   * Map database results to Message model instances
   */
  protected mapResultToModel(data: Record<string, unknown>): MessageWithIndex {
    const message = new Message({
      id: data.id as string,
      conversationId: data.conversationId as string,
      senderId: data.senderId as string,
      content: data.content as string,
      type: data.type as MessageType,
      status: data.status as MessageStatus,
      metadata: data.metadata as Record<string, unknown>,
      readBy: data.readBy as string[],
      isEdited: data.isEdited as boolean,
      editedAt: data.editedAt ? new Date(data.editedAt as string) : undefined,
      attachments: data.attachments as string[],
      deletedForUserIds: data.deletedForUserIds as string[],
      sentAt: data.sentAt ? new Date(data.sentAt as string) : undefined,
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : undefined,
      updatedAt: data.updatedAt
        ? new Date(data.updatedAt as string)
        : undefined,
    });

    return message as MessageWithIndex;
  }

  protected async executeQuery<T = any>(
    query: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw new MessageOperationError("executeQuery", error);
    }
  }
}

// Export a singleton instance
export const messageRepository = new MessageRepository();
