import { Logger } from "../../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../../config";
import { BaseModelInterface } from "../../models/BaseModel";
import { ParticipantRole } from "../../models/messaging/Conversation";
import {
  Message,
  MessageAttributes,
  MessageStatus,
  MessageType,
} from "../../models/messaging/Message";
import { BaseRepository } from "../BaseRepository";
import {
  ConversationNotFoundError,
  conversationRepository,
} from "./ConversationRepository";

// Add custom interface to fix the type constraint error
export interface MessageWithIndex extends Message, BaseModelInterface {
  [key: string]: unknown;
}

export class MessageError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "MessageError";
  }
}

export class MessageNotFoundError extends MessageError {
  constructor(id: string) {
    super(`Message with ID ${id} not found`, "MESSAGE_NOT_FOUND");
  }
}

export class MessageValidationError extends MessageError {
  constructor(message: string) {
    super(message, "MESSAGE_VALIDATION_ERROR");
  }
}

export class MessagePermissionError extends MessageError {
  constructor(message: string) {
    super(message, "MESSAGE_PERMISSION_ERROR");
  }
}

export class MessageRepository extends BaseRepository<MessageWithIndex> {
  protected logger = new Logger("MessageRepository");
  protected tableName = "messages";
  protected columns = [
    "id",
    "conversation_id as conversationId",
    "sender_id as senderId",
    "content",
    "type",
    "status",
    "reply_to_id as replyToId",
    "metadata",
    "read_by as readBy",
    "is_edited as isEdited",
    "edited_at as editedAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Send a new message
   */
  async send(
    data: Omit<MessageAttributes, "id" | "createdAt" | "updatedAt">,
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
          data.conversationId as string,
        );
        if (!conversation) {
          throw new ConversationNotFoundError(data.conversationId as string);
        }

        // Check if user is a participant in the conversation
        if (!conversation.hasParticipant(data.senderId as string)) {
          throw new MessagePermissionError(
            "User is not a participant in this conversation",
          );
        }

        // Check if conversation is read-only
        if (conversation.isReadOnly) {
          throw new MessagePermissionError(
            "Cannot send messages to a read-only conversation",
          );
        }

        // Create the message
        const result = await super.create(message);
        const newMessage = this.mapResultToModel(
          result as Record<string, unknown>,
        );

        // Update conversation's last message
        await conversationRepository.updateLastMessage(
          data.conversationId as string,
          newMessage.id,
          newMessage.createdAt,
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
        this.logger.error("Error sending message", {
          data,
          error: error instanceof Error ? error.message : error,
        });
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
    userId?: string,
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

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map((row) => new Message(this.processMessageData(row)));
    } catch (error) {
      this.logger.error("Error finding messages by conversation ID", {
        conversationId,
        error: error instanceof Error ? error.message : error,
      });
      throw new MessageError("Failed to find messages", "QUERY_ERROR");
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        id,
      ]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0] as Record<string, unknown>);
    } catch (error) {
      this.logger.error("Error finding message by ID", {
        id,
        error: error instanceof Error ? error.message : error,
      });
      throw new MessageError("Failed to find message by ID", "QUERY_ERROR");
    }
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
        this.logger.error("Error marking message as read", {
          messageId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MessageError(
          "Failed to mark message as read",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Mark all messages in a conversation as read by a user
   */
  async markAllAsReadByUser(
    conversationId: string,
    userId: string,
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

        const { rowCount } = await DatabaseConnectionManager.getPool().query(
          query,
          [userId, conversationId],
        );
        return rowCount ?? 0;
      } catch (error) {
        this.logger.error("Error marking all messages as read", {
          conversationId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MessageError(
          "Failed to mark all messages as read",
          "UPDATE_ERROR",
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
    newContent: string,
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
            "Only the sender can edit a message",
          );
        }

        // Check if message can be edited
        if (message.status === MessageStatus.DELETED) {
          throw new MessageValidationError("Cannot edit a deleted message");
        }

        if (message.type !== MessageType.TEXT) {
          throw new MessageValidationError(
            `Cannot edit a ${message.type} message`,
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
        this.logger.error("Error editing message", {
          messageId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
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
            message.conversationId,
          );
          if (
            !conversation ||
            !conversation.participantDetails?.some(
              (p) => p.userId === userId && p.role === ParticipantRole.ADMIN,
            )
          ) {
            throw new MessagePermissionError(
              "No permission to delete this message",
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
        this.logger.error("Error soft deleting message", {
          messageId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MessageError("Failed to delete message", "DELETE_ERROR");
      }
    });
  }

  /**
   * Find unread messages count for a user
   */
  async getUnreadCount(
    userId: string,
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        userId,
      ]);
      const result = (rows[0] as {
        total?: string;
        by_conversation?: Record<string, number>;
      }) || { total: "0", by_conversation: {} };

      return {
        total: parseInt(result.total || "0", 10),
        byConversation: result.by_conversation || {},
      };
    } catch (error) {
      this.logger.error("Error getting unread count", {
        userId,
        error: error instanceof Error ? error.message : error,
      });
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
    offset = 0,
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        `%${searchTerm}%`,
        userId,
        limit.toString(),
        offset.toString(),
      ]);

      return rows.map((row) => new Message(this.processMessageData(row)));
    } catch (error) {
      this.logger.error("Error searching messages", {
        userId,
        searchTerm,
        error: error instanceof Error ? error.message : error,
      });
      throw new MessageError("Failed to search messages", "QUERY_ERROR");
    }
  }

  /**
   * Process message data from database
   */
  private processMessageData(
    data: unknown,
  ): MessageAttributes & { senderId: string; content: string } {
    const typedData = data as Record<string, unknown>;

    // Parse readBy if it's a string
    if (typeof typedData.readBy === "string") {
      try {
        typedData.readBy = JSON.parse(typedData.readBy) as string[];
      } catch (error) {
        this.logger.warn("Error parsing readBy", {
          error: error instanceof Error ? error.message : error,
          data: typedData.readBy,
        });
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
        this.logger.warn("Error parsing metadata", {
          error: error instanceof Error ? error.message : error,
          data: typedData.metadata,
        });
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
   * Map database row to Message model
   */
  protected mapResultToModel(row: Record<string, unknown>): MessageWithIndex {
    if (!row) return null as unknown as MessageWithIndex;

    // Convert database row to MessageAttributes
    const messageData = {
      id: String(row.id || ""),
      conversationId: String(row.conversationId || row.conversation_id || ""),
      senderId: String(row.senderId || row.sender_id || ""),
      content: String(row.content || ""),
      type: (row.type || MessageType.TEXT) as MessageType,
      status: (row.status || MessageStatus.SENT) as MessageStatus,
      replyToId:
        row.replyToId || row.reply_to_id
          ? String(row.replyToId || row.reply_to_id)
          : undefined,
      metadata: row.metadata as Record<string, unknown> | null,
      readBy: Array.isArray(row.readBy || row.read_by)
        ? ((row.readBy || row.read_by) as string[])
        : [],
      isEdited: Boolean(row.isEdited || row.is_edited || false),
      editedAt:
        row.editedAt || row.edited_at
          ? new Date(String(row.editedAt || row.edited_at))
          : null,
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    };

    return new Message(messageData) as MessageWithIndex;
  }
}

// Export a singleton instance
export const messageRepository = new MessageRepository();
