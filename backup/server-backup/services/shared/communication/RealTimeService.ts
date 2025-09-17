import { IWebSocketService } from "@/server/infrastructure/pubsub/IWebSocketService";

import { BaseService } from "../base/BaseService";
import {
  ResourceNotFoundError,
  ValidationError,
  PermissionError,
} from "../errors/ServiceError";

// Define interfaces for repository objects
interface NotificationRepository {
  create(data: Record<string, unknown>): Promise<Notification>;
  markAsRead(userId: string, notificationIds: string[]): Promise<void>;
  findByUserId(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly?: boolean
  ): Promise<{ notifications: Notification[]; total: number }>;
}

interface UserRepository {
  findByIds(userIds: string[]): Promise<Record<string, unknown>[]>;
  updatePresence(userId: string, status: PresenceStatus): Promise<void>;
}

interface ChatRoomRepository {
  create(data: Record<string, unknown>): Promise<ChatRoom>;
  findById(roomId: string): Promise<ChatRoom | null>;
}

interface ChatMessageRepository {
  create(data: Record<string, unknown>): Promise<ChatMessage>;
  findByRoomId(
    roomId: string,
    limit: number,
    before?: Date
  ): Promise<ChatMessage[]>;
}

interface ConnectionRepository {
  findUserConnections(userId: string): Promise<UserConnection[]>;
}

// Define a connection interface
export interface UserConnection {
  id?: string;
  userId: string;
  targetUserId: string;
  type?: string;
  status?: string;
  createdAt?: Date;
}

export enum NotificationType {
  POST_LIKE = "post:like",
  POST_COMMENT = "post:comment",
  FOLLOW = "user:follow",
  MESSAGE = "message:new",
  MEDIA_PROCESSED = "media:processed",
  CHAT_ROOM_ADDED = "chat:room:added",
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  read: boolean;
  created: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatRoom {
  id: string;
  name: string;
  creatorId: string;
  participantIds: string[];
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export type PresenceStatus = "online" | "away" | "offline";

/**
 * Service for real-time communication
 * Features:
 * 1. Event publishing for various domains
 * 2. Notification management
 * 3. Presence/online status tracking
 * 4. Room/channel management
 */
export class RealTimeService extends BaseService {
  constructor(
    private wsService: IWebSocketService,
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository,
    private chatRoomRepository: ChatRoomRepository,
    private chatMessageRepository: ChatMessageRepository,
    private connectionRepository: ConnectionRepository
  ) {
    super("RealTimeService");
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the service
   */
  private setupEventListeners(): void {
    // Setup event listeners here when needed
    this.logger.debug("Setting up real-time event listeners");
  }

  /**
   * Send a notification to a user
   * @param recipientId User ID of the recipient
   * @param type Notification type
   * @param data Notification data
   * @param senderId Optional ID of the user who triggered the notification
   */
  async sendNotification(
    recipientId: string,
    type: NotificationType,
    data: Record<string, unknown>,
    senderId?: string
  ): Promise<void> {
    try {
      // Create notification record
      const notification = await this.notificationRepository.create({
        userId: recipientId,
        type,
        data,
        senderId,
        read: false,
        createdAt: new Date(),
      });

      // Send real-time notification
      this.wsService.sendToUser(recipientId, "notification", {
        id: notification.id,
        type,
        data,
        senderId,
        created: notification.created,
      });
    } catch (error) {
      this.logger.error("Failed to send notification", {
        recipientId,
        type,
        error,
      });
    }
  }

  /**
   * Mark notifications as read
   * @param userId User ID
   * @param notificationIds Array of notification IDs to mark as read
   */
  async markNotificationsAsRead(
    userId: string,
    notificationIds: string[]
  ): Promise<void> {
    await this.notificationRepository.markAsRead(userId, notificationIds);

    // Send update to connected clients
    this.wsService.sendToUser(userId, "notifications:marked-read", {
      ids: notificationIds,
    });
  }

  /**
   * Get notifications for a user
   * @param userId User ID
   * @param options Query options
   */
  async getUserNotifications(
    userId: string,
    options: { limit: number; offset: number; unreadOnly?: boolean }
  ): Promise<{ notifications: Notification[]; total: number }> {
    return this.notificationRepository.findByUserId(
      userId,
      options.limit,
      options.offset,
      options.unreadOnly
    );
  }

  /**
   * Create a chat room
   * @param name Room name
   * @param creatorId Creator's user ID
   * @param participantIds IDs of participants to add to the room
   */
  async createChatRoom(
    name: string,
    creatorId: string,
    participantIds: string[]
  ): Promise<ChatRoom> {
    // Validate participants
    const uniqueParticipantIds = [...new Set([creatorId, ...participantIds])];

    const participants =
      await this.userRepository.findByIds(uniqueParticipantIds);
    if (participants.length !== uniqueParticipantIds.length) {
      throw new ValidationError("One or more participants not found");
    }

    // Create room
    const room = await this.chatRoomRepository.create({
      name,
      creatorId,
      participantIds: uniqueParticipantIds,
      createdAt: new Date(),
    });

    // Subscribe participants to room
    uniqueParticipantIds.forEach((userId) => {
      this.wsService.subscribeToChannel(userId, `chat:${room.id}`);
    });

    // Notify participants
    uniqueParticipantIds.forEach((userId) => {
      if (userId !== creatorId) {
        this.sendNotification(
          userId,
          NotificationType.CHAT_ROOM_ADDED,
          { roomId: room.id, roomName: name },
          creatorId
        );
      }
    });

    return room;
  }

  /**
   * Send a message to a chat room
   * @param roomId Room ID
   * @param senderId Sender's user ID
   * @param content Message content
   */
  async sendChatMessage(
    roomId: string,
    senderId: string,
    content: string
  ): Promise<ChatMessage> {
    // Validate room and membership
    const room = await this.chatRoomRepository.findById(roomId);

    if (!room) {
      throw new ResourceNotFoundError("ChatRoom", roomId);
    }

    if (!room.participantIds.includes(senderId)) {
      throw new PermissionError("You are not a member of this chat room");
    }

    // Create message
    const message = await this.chatMessageRepository.create({
      roomId,
      senderId,
      content,
      createdAt: new Date(),
    });

    // Broadcast to room
    this.wsService.broadcastToChannel(`chat:${roomId}`, "chat:message", {
      id: message.id,
      roomId,
      senderId,
      content,
      createdAt: message.createdAt,
    });

    return message;
  }

  /**
   * Update a user's presence status
   * @param userId User ID
   * @param status Presence status
   */
  async updateUserPresence(
    userId: string,
    status: PresenceStatus
  ): Promise<void> {
    // Update presence status
    await this.userRepository.updatePresence(userId, status);

    // Get user's friends/followers
    const connections =
      await this.connectionRepository.findUserConnections(userId);

    // Notify connections of status change
    connections.forEach((connection: UserConnection) => {
      this.wsService.sendToUser(connection.userId, "presence:update", {
        userId,
        status,
      });
    });
  }

  /**
   * Get chat room messages
   * @param roomId Room ID
   * @param userId User ID requesting the messages
   * @param limit Maximum number of messages to return
   * @param before Timestamp to get messages before
   */
  async getChatMessages(
    roomId: string,
    userId: string,
    limit: number = 50,
    before?: Date
  ): Promise<ChatMessage[]> {
    // Validate room and membership
    const room = await this.chatRoomRepository.findById(roomId);

    if (!room) {
      throw new ResourceNotFoundError("ChatRoom", roomId);
    }

    if (!room.participantIds.includes(userId)) {
      throw new PermissionError("You are not a member of this chat room");
    }

    // Get messages
    return this.chatMessageRepository.findByRoomId(roomId, limit, before);
  }

  /**
   * Subscribe a user to events for a specific entity
   * @param userId User ID
   * @param entityType Entity type
   * @param entityId Entity ID
   */
  async subscribeToEntity(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    const channelName = `${entityType}:${entityId}`;
    this.wsService.subscribeToChannel(userId, channelName);
  }

  /**
   * Unsubscribe a user from events for a specific entity
   * @param userId User ID
   * @param entityType Entity type
   * @param entityId Entity ID
   */
  async unsubscribeFromEntity(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    const channelName = `${entityType}:${entityId}`;
    this.wsService.unsubscribeFromChannel(userId, channelName);
  }

  /**
   * Publish an event for a specific entity
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param eventName Event name
   * @param data Event data
   */
  async publishEntityEvent(
    entityType: string,
    entityId: string,
    eventName: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const channelName = `${entityType}:${entityId}`;
    this.wsService.broadcastToChannel(channelName, eventName, data);
  }
}
