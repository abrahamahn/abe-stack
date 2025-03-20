import { Logger } from "../../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../../config";
import {
  Conversation,
  ConversationAttributes,
  ConversationStatus,
  ConversationType,
  ParticipantRole,
} from "../../models/messaging/Conversation";
import { BaseRepository } from "../BaseRepository";

export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ConversationError";
  }
}

export class ConversationNotFoundError extends ConversationError {
  constructor(id: string) {
    super(`Conversation with ID ${id} not found`, "CONVERSATION_NOT_FOUND");
  }
}

export class ConversationValidationError extends ConversationError {
  constructor(message: string) {
    super(message, "CONVERSATION_VALIDATION_ERROR");
  }
}

export class ConversationPermissionError extends ConversationError {
  constructor(message: string) {
    super(message, "CONVERSATION_PERMISSION_ERROR");
  }
}

export class ConversationRepository extends BaseRepository<Conversation> {
  protected logger = new Logger("ConversationRepository");
  protected tableName = "conversations";
  protected columns = [
    "id",
    "title",
    "type",
    "participant_ids as participantIds",
    "participant_details as participantDetails",
    "creator_id as creatorId",
    "last_message_id as lastMessageId",
    "last_message_sent_at as lastMessageSentAt",
    "status",
    "is_encrypted as isEncrypted",
    "is_read_only as isReadOnly",
    "max_participants as maxParticipants",
    "metadata",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Create a new conversation with validation
   */
  async create(
    data: Omit<ConversationAttributes, "id" | "createdAt" | "updatedAt"> & {
      creatorId: string;
      participantIds: string[];
    },
  ): Promise<Conversation> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = new Conversation(data);
        conversation.validate();

        // For direct messages, check if conversation already exists
        if (
          conversation.isDirectMessage() &&
          conversation.participantIds.length === 2
        ) {
          const [userA, userB] = conversation.participantIds;
          const existing = await this.findDirectConversation(userA, userB);
          if (existing) {
            return existing;
          }
        }

        const result = await super.create(conversation);
        return new Conversation(result);
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error creating conversation", {
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to create conversation",
          "CREATE_ERROR",
        );
      }
    });
  }

  /**
   * Update an existing conversation with validation
   */
  async update(
    id: string,
    data: Partial<ConversationAttributes>,
  ): Promise<Conversation | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new ConversationNotFoundError(id);
        }

        // Special handling for direct messages - they should always keep exactly 2 participants
        if (
          existing.isDirectMessage() &&
          data.participantIds &&
          data.participantIds.length !== 2
        ) {
          throw new ConversationValidationError(
            "Direct conversations must have exactly two participants",
          );
        }

        const conversation = new Conversation({ ...existing, ...data });
        conversation.validate();

        const result = await super.update(id, conversation);
        if (!result) {
          throw new ConversationNotFoundError(id);
        }
        return new Conversation(result);
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error updating conversation", {
          id,
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to update conversation",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new ConversationNotFoundError(id);
        }

        return await super.delete(id);
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error deleting conversation", {
          id,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to delete conversation",
          "DELETE_ERROR",
        );
      }
    });
  }

  /**
   * Find a conversation by ID
   */
  async findById(id: string): Promise<Conversation | null> {
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

      return new Conversation(this.processConversationData(rows[0]));
    } catch (error) {
      this.logger.error("Error finding conversation by ID", {
        id,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to find conversation by ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find conversations for a specific user
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    excludeArchived = true,
  ): Promise<Conversation[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE participant_ids @> ARRAY[$1]::uuid[]
      `;

      const params: unknown[] = [userId];

      if (excludeArchived) {
        query += ` AND status != $${params.length + 1}`;
        params.push(ConversationStatus.ARCHIVED);
      }

      query += ` ORDER BY last_message_sent_at DESC NULLS LAST`;
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(
        (row) => new Conversation(this.processConversationData(row)),
      );
    } catch (error) {
      this.logger.error("Error finding conversations by user ID", {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to find conversations by user ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find direct conversation between two users
   */
  async findDirectConversation(
    userIdA: string,
    userIdB: string,
  ): Promise<Conversation | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
          AND array_length(participant_ids, 1) = 2
          AND participant_ids @> ARRAY[$2, $3]::uuid[]
        LIMIT 1
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        ConversationType.DIRECT,
        userIdA,
        userIdB,
      ]);

      if (rows.length === 0) {
        return null;
      }

      return new Conversation(this.processConversationData(rows[0]));
    } catch (error) {
      this.logger.error("Error finding direct conversation", {
        userIdA,
        userIdB,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to find direct conversation",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find group conversations for a user
   */
  async findGroupConversations(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<Conversation[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
          AND participant_ids @> ARRAY[$2]::uuid[]
        ORDER BY last_message_sent_at DESC NULLS LAST
        LIMIT $3 OFFSET $4
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        ConversationType.GROUP,
        userId,
        limit.toString(),
        offset.toString(),
      ]);

      return rows.map(
        (row) => new Conversation(this.processConversationData(row)),
      );
    } catch (error) {
      this.logger.error("Error finding group conversations", {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to find group conversations",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find conversations by their status
   */
  async findByStatus(
    status: ConversationStatus,
    limit = 20,
    offset = 0,
  ): Promise<Conversation[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        status,
        limit.toString(),
        offset.toString(),
      ]);

      return rows.map(
        (row) => new Conversation(this.processConversationData(row)),
      );
    } catch (error) {
      this.logger.error("Error finding conversations by status", {
        status,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to find conversations by status",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Search conversations by title
   */
  async searchByTitle(
    searchTerm: string,
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<Conversation[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE title ILIKE $1
          AND participant_ids @> ARRAY[$2]::uuid[]
        ORDER BY 
          CASE 
            WHEN title ILIKE $3 THEN 0
            WHEN title ILIKE $4 THEN 1
            ELSE 2
          END,
          last_message_sent_at DESC NULLS LAST
        LIMIT $5 OFFSET $6
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        `%${searchTerm}%`,
        userId,
        `${searchTerm}%`,
        `% ${searchTerm}%`,
        limit.toString(),
        offset.toString(),
      ]);

      return rows.map(
        (row) => new Conversation(this.processConversationData(row)),
      );
    } catch (error) {
      this.logger.error("Error searching conversations by title", {
        searchTerm,
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to search conversations by title",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Update the last message for a conversation
   */
  async updateLastMessage(
    conversationId: string,
    messageId: string,
    sentAt: Date,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        conversation.updateLastMessage(messageId, sentAt);

        const result = await super.update(conversationId, {
          lastMessageId: messageId,
          lastMessageSentAt: sentAt,
        });

        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error updating last message", {
          conversationId,
          messageId,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to update last message",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Add a participant to a conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        // Direct messages cannot have more than 2 participants
        if (conversation.isDirectMessage()) {
          throw new ConversationValidationError(
            "Cannot add participants to direct messages",
          );
        }

        // Check if user is already a participant
        if (conversation.hasParticipant(userId)) {
          return true; // Already a participant
        }

        conversation.addParticipant(userId, role);

        const result = await super.update(conversationId, {
          participantIds: conversation.participantIds,
          participantDetails: conversation.participantDetails,
        });

        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error adding participant", {
          conversationId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to add participant",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Remove a participant from a conversation
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        // Direct messages cannot remove participants
        if (conversation.isDirectMessage()) {
          throw new ConversationValidationError(
            "Cannot remove participants from direct messages",
          );
        }

        // Check if user is actually a participant
        if (!conversation.hasParticipant(userId)) {
          return true; // Not a participant, nothing to do
        }

        conversation.removeParticipant(userId);

        const result = await super.update(conversationId, {
          participantIds: conversation.participantIds,
          participantDetails: conversation.participantDetails,
        });

        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error removing participant", {
          conversationId,
          userId,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to remove participant",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    conversationId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        // Direct messages don't have roles
        if (conversation.isDirectMessage()) {
          throw new ConversationValidationError(
            "Direct messages don't support participant roles",
          );
        }

        conversation.updateParticipantRole(userId, role);

        const result = await super.update(conversationId, {
          participantDetails: conversation.participantDetails,
        });

        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error updating participant role", {
          conversationId,
          userId,
          role,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to update participant role",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Update conversation status
   */
  async updateStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        conversation.setStatus(status);

        const result = await super.update(conversationId, { status });
        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error updating conversation status", {
          conversationId,
          status,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to update conversation status",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Set read-only status of a conversation
   */
  async setReadOnly(
    conversationId: string,
    isReadOnly: boolean,
  ): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const conversation = await this.findById(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(conversationId);
        }

        conversation.setReadOnly(isReadOnly);

        const result = await super.update(conversationId, { isReadOnly });
        return !!result;
      } catch (error) {
        if (error instanceof ConversationError) {
          throw error;
        }
        this.logger.error("Error setting read-only status", {
          conversationId,
          isReadOnly,
          error: error instanceof Error ? error.message : error,
        });
        throw new ConversationError(
          "Failed to set read-only status",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Get conversation statistics (admin function)
   */
  async getConversationStatistics(): Promise<{
    total: number;
    byType: Record<ConversationType, number>;
    byStatus: Record<ConversationStatus, number>;
    activeUsersCount: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          json_object_agg(type, type_count) as by_type,
          json_object_agg(status, status_count) as by_status,
          (
            SELECT COUNT(DISTINCT unnest(participant_ids))
            FROM ${this.tableName}
            WHERE last_message_sent_at > NOW() - INTERVAL '30 days'
          ) as active_users_count
        FROM (
          SELECT 
            type,
            COUNT(*) as type_count,
            status,
            COUNT(*) as status_count
          FROM ${this.tableName}
          GROUP BY type, status
        ) stats
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query);
      const stats = rows[0] as {
        total: string;
        by_type: Record<ConversationType, number>;
        by_status: Record<ConversationStatus, number>;
        active_users_count: string;
      };

      return {
        total: parseInt(stats.total, 10),
        byType: stats.by_type || {},
        byStatus: stats.by_status || {},
        activeUsersCount: parseInt(stats.active_users_count, 10),
      };
    } catch (error) {
      this.logger.error("Error getting conversation statistics", {
        error: error instanceof Error ? error.message : error,
      });
      throw new ConversationError(
        "Failed to get conversation statistics",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Process conversation data from database
   */
  private processConversationData(
    data: unknown,
  ): ConversationAttributes & { creatorId: string; participantIds: string[] } {
    const record = data as Record<string, unknown>;

    // Parse participantIds if string
    if (record.participantIds && typeof record.participantIds === "string") {
      try {
        record.participantIds = JSON.parse(record.participantIds);
      } catch (error) {
        this.logger.warn("Error parsing participant IDs", {
          error: error instanceof Error ? error.message : error,
          data: record.participantIds,
        });
        record.participantIds = [];
      }
    }

    // Parse participantDetails if string
    if (
      record.participantDetails &&
      typeof record.participantDetails === "string"
    ) {
      try {
        record.participantDetails = JSON.parse(record.participantDetails);
      } catch (error) {
        this.logger.warn("Error parsing participant details", {
          error: error instanceof Error ? error.message : error,
          data: record.participantDetails,
        });
        record.participantDetails = null;
      }
    }

    // Parse metadata if string
    if (record.metadata && typeof record.metadata === "string") {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (error) {
        this.logger.warn("Error parsing metadata", {
          error: error instanceof Error ? error.message : error,
          data: record.metadata,
        });
        record.metadata = null;
      }
    }

    return record as ConversationAttributes & {
      creatorId: string;
      participantIds: string[];
    };
  }

  protected mapResultToModel(row: Record<string, unknown>): Conversation {
    if (!row) return null as unknown as Conversation;
    return new Conversation(this.processConversationData(row));
  }
}

// Export a singleton instance
export const conversationRepository = new ConversationRepository();
