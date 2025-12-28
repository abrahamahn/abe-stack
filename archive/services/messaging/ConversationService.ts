import {
  Conversation,
  ConversationType,
  ConversationStatus,
  ParticipantRole,
  Participant,
} from "@/server/database/models/messaging/Conversation";
import { UserRepository } from "@/server/database/repositories/auth/UserRepository";
import { ConversationRepository } from "@/server/database/repositories/messaging/ConversationRepository";
import { CacheService } from "@/server/infrastructure/cache";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Constants
const CONVERSATION_CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = "conversation:";
const DEFAULT_GROUP_SIZE_LIMIT = 100;

export interface ConversationCreateDTO {
  title?: string;
  participantIds: string[];
  type: ConversationType;
  isEncrypted?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationUpdateDTO {
  title?: string;
  status?: ConversationStatus;
  isReadOnly?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationQueryOptions extends PaginationOptions {
  status?: ConversationStatus;
  excludeArchived?: boolean;
  type?: ConversationType;
}

export interface ParticipantAddDTO {
  userId: string;
  role?: ParticipantRole;
}

/**
 * Service responsible for managing messaging conversations.
 * Features:
 * 1. Conversation creation and management
 * 2. Participant management
 * 3. Privacy and security controls
 * 4. Conversation metadata and settings
 */
export class ConversationService extends BaseService {
  constructor(
    private conversationRepository: ConversationRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("ConversationService");
  }

  /**
   * Create a new conversation
   *
   * @param userId - ID of the user creating the conversation
   * @param data - Conversation creation data
   * @returns Newly created conversation
   */
  async createConversation(
    userId: string,
    data: ConversationCreateDTO
  ): Promise<Conversation> {
    try {
      // Validate participants exist
      const uniqueParticipantIds = [
        ...new Set([...data.participantIds, userId]),
      ];
      await this.validateParticipants(uniqueParticipantIds);

      // Create participant details
      const participantDetails: Participant[] = uniqueParticipantIds.map(
        (id) => ({
          userId: id,
          role: id === userId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
          joinedAt: new Date(),
        })
      );

      // Create conversation
      const conversation = await this.conversationRepository.create({
        title:
          data.type === ConversationType.GROUP
            ? data.title || "Group Chat"
            : null,
        type: data.type,
        participantIds: uniqueParticipantIds,
        participantDetails,
        creatorId: userId,
        lastMessageId: null,
        lastMessageSentAt: null,
        status: ConversationStatus.ACTIVE,
        isEncrypted: data.isEncrypted || false,
        isReadOnly: false,
        maxParticipants:
          data.type === ConversationType.GROUP ? DEFAULT_GROUP_SIZE_LIMIT : 2,
        metadata: data.metadata || null,
      });

      // Track metrics
      this.metricsService.recordOperationDuration("conversation_creation", 1);

      return conversation;
    } catch (error) {
      this.logger.error("Error creating conversation", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   *
   * @param conversationId - ID of the conversation to retrieve
   * @param userId - ID of the user requesting the conversation
   * @returns Conversation if found and user is a participant, null otherwise
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation | null> {
    try {
      // Try to get from cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      const cachedConversation =
        await this.cacheService.get<Conversation>(cacheKey);
      if (cachedConversation) {
        if (cachedConversation.participantIds.includes(userId)) {
          return cachedConversation;
        }
        return null;
      }

      // Get from repository
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation || !conversation.participantIds.includes(userId)) {
        return null;
      }

      // Cache the result
      await this.cacheService.set(
        cacheKey,
        conversation,
        CONVERSATION_CACHE_TTL
      );

      return conversation;
    } catch (error) {
      this.logger.error("Error getting conversation", {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get direct conversation between two users
   *
   * @param userAId - First user ID
   * @param userBId - Second user ID
   * @returns Direct conversation if found, null otherwise
   */
  async getDirectConversation(
    userAId: string,
    userBId: string
  ): Promise<Conversation | null> {
    try {
      return await this.conversationRepository.findDirectConversation(
        userAId,
        userBId
      );
    } catch (error) {
      this.logger.error("Error getting direct conversation", {
        userAId,
        userBId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update conversation
   *
   * @param userId - ID of the user updating the conversation
   * @param conversationId - ID of the conversation to update
   * @param updates - Update data
   * @returns Updated conversation
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    updates: ConversationUpdateDTO
  ): Promise<Conversation> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify user is admin (creator)
      if (conversation.creatorId !== userId) {
        throw new ValidationError(
          "Only the conversation creator can update it"
        );
      }

      // Update conversation
      const updatedConversation = await this.conversationRepository.update(
        conversationId,
        {
          title: updates.title,
          status: updates.status,
          isReadOnly: updates.isReadOnly,
          metadata:
            updates.metadata !== undefined
              ? { ...conversation.metadata, ...updates.metadata }
              : conversation.metadata,
        }
      );

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);

      return updatedConversation!;
    } catch (error) {
      this.logger.error("Error updating conversation", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add participants to a conversation
   *
   * @param userId - ID of the user adding participants
   * @param conversationId - ID of the conversation
   * @param participants - Participants to add
   */
  async addParticipants(
    userId: string,
    conversationId: string,
    participants: ParticipantAddDTO[]
  ): Promise<void> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify it's a group conversation
      if (conversation.type !== ConversationType.GROUP) {
        throw new ValidationError(
          "Cannot add participants to a direct conversation"
        );
      }

      // Verify user is a participant
      if (!conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "You are not a participant in this conversation"
        );
      }

      // Verify user is admin
      const adminDetails = conversation.participantDetails?.find(
        (p) => p.userId === userId
      );
      if (!adminDetails || adminDetails.role !== ParticipantRole.ADMIN) {
        throw new ValidationError("Only admins can add participants");
      }

      // Validate participant limit
      const uniqueParticipantIds = [
        ...new Set(participants.map((p) => p.userId)),
      ];
      const newIds = uniqueParticipantIds.filter(
        (id) => !conversation.participantIds.includes(id)
      );
      if (newIds.length === 0) {
        return; // Nothing to do
      }

      // Check max participants limit
      if (
        conversation.maxParticipants &&
        conversation.participantIds.length + newIds.length >
          conversation.maxParticipants
      ) {
        throw new ValidationError(
          `Cannot exceed maximum of ${conversation.maxParticipants} participants`
        );
      }

      // Validate new participants
      await this.validateParticipants(newIds);

      // Create participant details
      const now = new Date();
      const newParticipantDetails: Participant[] = [
        ...(conversation.participantDetails || []),
        ...newIds.map((id) => {
          const participant = participants.find((p) => p.userId === id);
          return {
            userId: id,
            role: participant?.role || ParticipantRole.MEMBER,
            joinedAt: now,
          };
        }),
      ];

      // Update conversation
      await this.conversationRepository.update(conversationId, {
        participantIds: [...conversation.participantIds, ...newIds],
        participantDetails: newParticipantDetails,
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration(
        "participant_addition",
        newIds.length
      );
    } catch (error) {
      this.logger.error("Error adding participants", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove participants from a conversation
   *
   * @param userId - ID of the user removing participants
   * @param conversationId - ID of the conversation
   * @param participantIds - IDs of participants to remove
   */
  async removeParticipants(
    userId: string,
    conversationId: string,
    participantIds: string[]
  ): Promise<void> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify it's a group conversation
      if (conversation.type !== ConversationType.GROUP) {
        throw new ValidationError(
          "Cannot remove participants from a direct conversation"
        );
      }

      // Verify user is a participant
      if (!conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "You are not a participant in this conversation"
        );
      }

      // Verify user is admin
      const adminDetails = conversation.participantDetails?.find(
        (p) => p.userId === userId
      );
      if (!adminDetails || adminDetails.role !== ParticipantRole.ADMIN) {
        throw new ValidationError("Only admins can remove participants");
      }

      // Cannot remove the creator/admin
      if (participantIds.includes(conversation.creatorId)) {
        throw new ValidationError("Cannot remove the conversation creator");
      }

      // Filter out IDs to remove
      const remainingParticipantIds = conversation.participantIds.filter(
        (id) => !participantIds.includes(id)
      );

      // Must have at least 2 participants
      if (remainingParticipantIds.length < 2) {
        throw new ValidationError(
          "Conversation must have at least 2 participants"
        );
      }

      // Update participant details
      const remainingParticipantDetails =
        conversation.participantDetails?.filter(
          (p) => !participantIds.includes(p.userId)
        ) || [];

      // Update conversation
      await this.conversationRepository.update(conversationId, {
        participantIds: remainingParticipantIds,
        participantDetails: remainingParticipantDetails,
      });

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration(
        "participant_removal",
        participantIds.length
      );
    } catch (error) {
      this.logger.error("Error removing participants", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Leave a conversation
   *
   * @param userId - ID of the user leaving the conversation
   * @param conversationId - ID of the conversation
   */
  async leaveConversation(
    userId: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify user is a participant
      if (!conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "You are not a participant in this conversation"
        );
      }

      // Direct conversations cannot be left, only archived
      if (conversation.type === ConversationType.DIRECT) {
        await this.conversationRepository.updateStatus(
          conversationId,
          ConversationStatus.ARCHIVED
        );
        const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
        await this.cacheService.delete(cacheKey);
        return;
      }

      // If user is the creator/admin, need to transfer ownership if there are other participants
      const remainingParticipants = conversation.participantIds.filter(
        (id) => id !== userId
      );
      if (
        conversation.creatorId === userId &&
        remainingParticipants.length > 0
      ) {
        // Transfer ownership to another participant (first one available)
        const newCreatorId = remainingParticipants[0];

        // Update participant details
        const updatedParticipantDetails =
          conversation.participantDetails
            ?.map((p) => {
              if (p.userId === newCreatorId) {
                return { ...p, role: ParticipantRole.ADMIN };
              }
              return p;
            })
            .filter((p) => p.userId !== userId) || [];

        await this.conversationRepository.update(conversationId, {
          participantIds: remainingParticipants,
          participantDetails: updatedParticipantDetails,
          creatorId: newCreatorId,
        });
      } else {
        // Remove user from participants
        const updatedParticipantDetails =
          conversation.participantDetails?.filter((p) => p.userId !== userId) ||
          [];

        await this.conversationRepository.update(conversationId, {
          participantIds: remainingParticipants,
          participantDetails: updatedParticipantDetails,
        });
      }

      // If no participants left, delete the conversation
      if (remainingParticipants.length === 0) {
        await this.conversationRepository.delete(conversationId);
      }

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration("conversation_leave", 1);
    } catch (error) {
      this.logger.error("Error leaving conversation", {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update conversation status
   *
   * @param userId - ID of the user updating the status
   * @param conversationId - ID of the conversation
   * @param status - New status
   */
  async updateStatus(
    userId: string,
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify user is a participant
      if (!conversation.participantIds.includes(userId)) {
        throw new ValidationError(
          "You are not a participant in this conversation"
        );
      }

      // Update status
      await this.conversationRepository.updateStatus(conversationId, status);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error updating conversation status", {
        userId,
        conversationId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get user's conversations
   *
   * @param userId - ID of the user
   * @param options - Query options
   * @returns Paginated conversation results
   */
  async getUserConversations(
    userId: string,
    options: ConversationQueryOptions
  ): Promise<PaginatedResult<Conversation>> {
    try {
      // Get conversations
      const conversations = await this.conversationRepository.findByUserId(
        userId,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        options.excludeArchived !== false
      );

      // Filter by type if specified
      const filteredConversations = options.type
        ? conversations.filter((c) => c.type === options.type)
        : conversations;

      // Track metrics
      this.metricsService.recordOperationDuration("conversation_retrieval", 1);

      return {
        items: filteredConversations,
        total: filteredConversations.length,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(
          filteredConversations.length / (options.limit || 20)
        ),
      };
    } catch (error) {
      this.logger.error("Error getting user conversations", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set read-only status for a conversation
   *
   * @param userId - ID of the user setting the status
   * @param conversationId - ID of the conversation
   * @param isReadOnly - Whether the conversation should be read-only
   */
  async setReadOnly(
    userId: string,
    conversationId: string,
    isReadOnly: boolean
  ): Promise<void> {
    try {
      // Get existing conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new ResourceNotFoundError("Conversation", conversationId);
      }

      // Verify user is admin
      if (conversation.creatorId !== userId) {
        throw new ValidationError(
          "Only the conversation creator can change read-only status"
        );
      }

      // Update status
      await this.conversationRepository.setReadOnly(conversationId, isReadOnly);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${conversationId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error setting read-only status", {
        userId,
        conversationId,
        isReadOnly,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate that all participants exist
   *
   * @param participantIds - IDs of participants to validate
   * @throws ValidationError if any participant doesn't exist
   */
  private async validateParticipants(participantIds: string[]): Promise<void> {
    try {
      const users = await Promise.all(
        participantIds.map((id) => this.userRepository.findById(id))
      );

      const missingUsers = users.filter((user) => !user);
      if (missingUsers.length > 0) {
        throw new ValidationError("One or more participants do not exist");
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError("Error validating participants");
    }
  }
}
