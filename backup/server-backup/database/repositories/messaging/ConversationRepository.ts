import {
  Conversation,
  ConversationAttributes,
  ConversationStatus,
  ConversationType,
  ParticipantRole,
} from "@/server/database/models/messaging/Conversation";
import {
  ConversationError,
  ConversationNotFoundError,
  ConversationValidationError,
  ConversationOperationError,
  ConversationAlreadyExistsError,
  ConversationCapacityError,
  ConversationParticipantError,
} from "@/server/infrastructure/errors/domain/messaging/ConversationError";

import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling Conversation database operations
 * This class is responsible for:
 * 1. All database operations related to conversations
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for conversations
 * 4. Throwing domain-specific errors for error cases
 * 5. NOT implementing business logic - that belongs in the Conversation model
 */
export class ConversationRepository extends BaseRepository<Conversation> {
  protected tableName = "conversations";
  protected columns = [
    "id",
    "title",
    "type",
    "owner_id as ownerId",
    "status",
    "creator_id as creatorId",
    "participant_ids as participantIds",
    "is_read_only as isReadOnly",
    "is_encrypted as isEncrypted",
    "max_participants as maxParticipants",
    "participant_details as participantDetails",
    "metadata",
    "last_message_id as lastMessageId",
    "last_message_sent_at as lastMessageSentAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Conversation");
  }

  /**
   * Create a new conversation with validation
   * @throws ConversationValidationError if validation fails
   * @throws ConversationAlreadyExistsError if direct conversation already exists
   * @throws ConversationOperationError if there's an error during the operation
   */
  async create(
    data: Omit<ConversationAttributes, "id" | "createdAt" | "updatedAt"> & {
      creatorId: string;
      participantIds: string[];
    }
  ): Promise<Conversation> {
    try {
      const conversation = new Conversation(data);
      const validationErrors = conversation.validate();

      if (validationErrors.length > 0) {
        throw new ConversationValidationError(validationErrors);
      }

      // For direct messages, check if conversation already exists
      if (
        conversation.isDirectMessage() &&
        conversation.participantIds.length === 2
      ) {
        const [userA, userB] = conversation.participantIds;
        const existing = await this.findDirectConversation(userA, userB);
        if (existing) {
          throw new ConversationAlreadyExistsError({
            existingId: existing.id,
            participants: [userA, userB],
          });
        }
      }

      // Execute insert using BaseRepository's executeQuery
      const columns = Object.keys(conversation).filter(
        (key) => key !== "participantDetails" && key !== "metadata"
      );

      const values = columns.map(
        (key) => conversation[key as keyof Conversation]
      );
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);
      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (
        error instanceof ConversationValidationError ||
        error instanceof ConversationAlreadyExistsError
      ) {
        throw error;
      }
      throw new ConversationOperationError("create", error);
    }
  }

  /**
   * Update an existing conversation with validation
   * @throws ConversationNotFoundError if conversation doesn't exist
   * @throws ConversationValidationError if validation fails
   * @throws ConversationOperationError if there's an error during the operation
   */
  async update(
    id: string,
    data: Partial<ConversationAttributes>
  ): Promise<Conversation> {
    try {
      // First find the conversation to make sure it exists
      const existing = await this.findByIdOrThrow(id);

      // Special handling for direct messages - they should always keep exactly 2 participants
      if (
        existing.isDirectMessage() &&
        data.participantIds &&
        data.participantIds.length !== 2
      ) {
        throw new ConversationValidationError(
          "Direct conversations must have exactly two participants"
        );
      }

      // Create a new conversation object with the updated data for validation
      const conversation = new Conversation({ ...existing, ...data });
      const validationErrors = conversation.validate();

      if (validationErrors.length > 0) {
        throw new ConversationValidationError(validationErrors);
      }

      // Prepare update query
      const updateFields = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => key);

      if (updateFields.length === 0) {
        return existing; // Nothing to update
      }

      const setClauses = updateFields.map(
        (field, index) => `${this.toSnakeCase(field)} = $${index + 2}`
      );

      const values = [
        id,
        ...updateFields.map(
          (field) => data[field as keyof ConversationAttributes]
        ),
      ];

      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(", ")},
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new ConversationNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (
        error instanceof ConversationNotFoundError ||
        error instanceof ConversationValidationError
      ) {
        throw error;
      }
      throw new ConversationOperationError("update", error);
    }
  }

  /**
   * Delete a conversation
   * @throws ConversationNotFoundError if conversation doesn't exist
   * @throws ConversationOperationError if there's an error during the operation
   */
  async delete(id: string): Promise<boolean> {
    try {
      // First verify the conversation exists
      await this.findByIdOrThrow(id);

      // Execute delete query
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.executeQuery(query, [id]);

      return result.rowCount > 0;
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        throw error;
      }
      throw new ConversationOperationError("delete", error);
    }
  }

  /**
   * Find a conversation by ID
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findById(id: string): Promise<Conversation | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      throw new ConversationOperationError("findById", error);
    }
  }

  /**
   * Find a conversation by ID or throw an error if it doesn't exist
   * @throws ConversationNotFoundError if conversation not found
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findByIdOrThrow(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  /**
   * Find conversations for a specific user
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    excludeArchived = true
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      throw new ConversationOperationError("findByUserId", error);
    }
  }

  /**
   * Find direct conversation between two users
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findDirectConversation(
    userIdA: string,
    userIdB: string
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

      const result = await this.executeQuery(query, [
        ConversationType.DIRECT,
        userIdA,
        userIdB,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      throw new ConversationOperationError("findDirectConversation", error);
    }
  }

  /**
   * Find group conversations for a user
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findGroupConversations(
    userId: string,
    limit = 20,
    offset = 0
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

      const result = await this.executeQuery(query, [
        ConversationType.GROUP,
        userId,
        limit,
        offset,
      ]);

      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      throw new ConversationOperationError("findGroupConversations", error);
    }
  }

  /**
   * Find conversations by their status
   * @throws ConversationOperationError if there's an error during the operation
   */
  async findByStatus(
    status: ConversationStatus,
    limit = 20,
    offset = 0
  ): Promise<Conversation[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [status, limit, offset]);

      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      throw new ConversationOperationError("findByStatus", error);
    }
  }

  /**
   * Search conversations by title
   * @throws ConversationOperationError if there's an error during the operation
   */
  async searchByTitle(
    searchTerm: string,
    userId: string,
    limit = 20,
    offset = 0
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

      const result = await this.executeQuery(query, [
        `%${searchTerm}%`,
        userId,
        `${searchTerm}%`,
        `% ${searchTerm}%`,
        limit,
        offset,
      ]);

      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      throw new ConversationOperationError("searchByTitle", error);
    }
  }

  /**
   * Update the last message for a conversation
   */
  async updateLastMessage(
    conversationId: string,
    messageId: string,
    sentAt: Date
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
        throw new ConversationError(
          "Failed to update last message",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Add a participant to a conversation
   * @throws ConversationNotFoundError if conversation doesn't exist
   * @throws ConversationValidationError for direct messages or invalid operation
   * @throws ConversationCapacityError if adding participant would exceed max participants
   * @throws ConversationOperationError if there's an error during the operation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER
  ): Promise<boolean> {
    try {
      const conversation = await this.findByIdOrThrow(conversationId);

      // Direct messages cannot have more than 2 participants
      if (conversation.isDirectMessage()) {
        throw new ConversationValidationError(
          "Cannot add participants to direct messages"
        );
      }

      // Check if user is already a participant
      if (conversation.hasParticipant(userId)) {
        return true; // Already a participant
      }

      // Check maximum participants constraint
      if (
        conversation.maxParticipants !== null &&
        conversation.participantIds.length >= conversation.maxParticipants
      ) {
        throw new ConversationCapacityError(
          conversationId,
          conversation.maxParticipants
        );
      }

      // Add participant to conversation
      conversation.addParticipant(userId, role);

      // Update in database
      const query = `
        UPDATE ${this.tableName}
        SET participant_ids = $2,
            participant_details = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [
        conversationId,
        conversation.participantIds,
        conversation.participantDetails,
      ]);

      return result.rowCount > 0;
    } catch (error) {
      if (
        error instanceof ConversationNotFoundError ||
        error instanceof ConversationValidationError ||
        error instanceof ConversationCapacityError
      ) {
        throw error;
      }
      throw new ConversationOperationError("addParticipant", error);
    }
  }

  /**
   * Remove a participant from a conversation
   * @throws ConversationNotFoundError if conversation doesn't exist
   * @throws ConversationValidationError for direct messages
   * @throws ConversationParticipantError if removing the last admin
   * @throws ConversationOperationError if there's an error during the operation
   */
  async removeParticipant(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const conversation = await this.findByIdOrThrow(conversationId);

      // Direct messages cannot remove participants
      if (conversation.isDirectMessage()) {
        throw new ConversationValidationError(
          "Cannot remove participants from direct messages"
        );
      }

      // Check if user is actually a participant
      if (!conversation.hasParticipant(userId)) {
        return true; // Not a participant, nothing to do
      }

      // Check if removing the last admin (for group conversations)
      if (conversation.isGroupChat() && conversation.participantDetails) {
        const isAdmin = conversation.participantDetails.some(
          (p) => p.userId === userId && p.role === ParticipantRole.ADMIN
        );

        if (isAdmin) {
          const adminCount = conversation.participantDetails.filter(
            (p) => p.role === ParticipantRole.ADMIN
          ).length;

          if (adminCount <= 1) {
            throw new ConversationParticipantError(
              "Cannot remove the last administrator from a group conversation",
              conversationId,
              userId,
              "remove"
            );
          }
        }
      }

      // Remove participant from conversation
      conversation.participantIds = conversation.participantIds.filter(
        (id) => id !== userId
      );

      if (conversation.participantDetails) {
        conversation.participantDetails =
          conversation.participantDetails.filter((p) => p.userId !== userId);
      }

      // Update in database
      const query = `
        UPDATE ${this.tableName}
        SET participant_ids = $2,
            participant_details = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [
        conversationId,
        conversation.participantIds,
        conversation.participantDetails,
      ]);

      return result.rowCount > 0;
    } catch (error) {
      if (
        error instanceof ConversationNotFoundError ||
        error instanceof ConversationValidationError ||
        error instanceof ConversationParticipantError
      ) {
        throw error;
      }
      throw new ConversationOperationError("removeParticipant", error);
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    conversationId: string,
    userId: string,
    role: ParticipantRole
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
            "Direct messages don't support participant roles"
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
        throw new ConversationError(
          "Failed to update participant role",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Update conversation status
   */
  async updateStatus(
    conversationId: string,
    status: ConversationStatus
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
        throw new ConversationError(
          "Failed to update conversation status",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Set read-only status of a conversation
   */
  async setReadOnly(
    conversationId: string,
    isReadOnly: boolean
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
        throw new ConversationError(
          "Failed to set read-only status",
          "UPDATE_ERROR"
        );
      }
    });
  }

  /**
   * Get conversation statistics (admin function)
   * @throws ConversationOperationError if there's an error during the operation
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

      const result = await this.executeQuery(query);
      const stats = result.rows[0] as {
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
      throw new ConversationOperationError("getConversationStatistics", error);
    }
  }

  /**
   * Convert camelCase to snake_case for database columns
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Map database results to Conversation model instances
   */
  protected mapResultToModel(row: Record<string, unknown>): Conversation {
    if (!row) return null as unknown as Conversation;

    // Process special fields that might need parsing from JSON strings
    const data = { ...row };

    // Parse arrays and objects from JSON strings if needed
    for (const field of ["participantIds", "participantDetails", "metadata"]) {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field] as string);
        } catch (error) {
          data[field] = field === "participantIds" ? [] : null;
        }
      }
    }

    // Create Conversation model from processed data
    const conversation = new Conversation({
      id: data.id as string,
      title: data.title as string | null,
      type: data.type as ConversationType,
      participantIds: Array.isArray(data.participantIds)
        ? (data.participantIds as string[])
        : [],
      participantDetails:
        data.participantDetails as Conversation["participantDetails"],
      creatorId: data.creatorId as string,
      lastMessageId: data.lastMessageId as string | null,
      lastMessageSentAt: data.lastMessageSentAt
        ? new Date(data.lastMessageSentAt as string)
        : null,
      status: data.status as ConversationStatus,
      isEncrypted: Boolean(data.isEncrypted),
      metadata: data.metadata as Record<string, unknown> | null,
      isReadOnly: Boolean(data.isReadOnly),
      maxParticipants: data.maxParticipants as number | null,
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : new Date(),
      updatedAt: data.updatedAt
        ? new Date(data.updatedAt as string)
        : new Date(),
    });

    return conversation;
  }
}

// Export a singleton instance
export const conversationRepository = new ConversationRepository();
