import {
  ChatRoom,
  ChatMessage,
} from "@/server/services/shared/communication/RealTimeService";

/**
 * Repository for managing chat rooms
 */
export interface ChatRoomRepository {
  /**
   * Create a new chat room
   * @param data Chat room data
   * @returns Created chat room
   */
  create(data: Omit<ChatRoom, "id">): Promise<ChatRoom>;

  /**
   * Find a chat room by ID
   * @param id Chat room ID
   * @returns Chat room if found, null otherwise
   */
  findById(id: string): Promise<ChatRoom | null>;

  /**
   * Find chat rooms by participant
   * @param userId User ID
   * @param limit Maximum number of rooms to return
   * @param offset Offset for pagination
   * @returns Chat rooms
   */
  findByParticipant(
    userId: string,
    limit: number,
    offset: number
  ): Promise<ChatRoom[]>;

  /**
   * Add participants to a chat room
   * @param roomId Chat room ID
   * @param participantIds IDs of participants to add
   * @returns Updated chat room
   */
  addParticipants(roomId: string, participantIds: string[]): Promise<ChatRoom>;

  /**
   * Remove participants from a chat room
   * @param roomId Chat room ID
   * @param participantIds IDs of participants to remove
   * @returns Updated chat room
   */
  removeParticipants(
    roomId: string,
    participantIds: string[]
  ): Promise<ChatRoom>;

  /**
   * Delete a chat room
   * @param roomId Chat room ID
   * @returns True if deleted, false otherwise
   */
  delete(roomId: string): Promise<boolean>;
}

/**
 * Repository for managing chat messages
 */
export interface ChatMessageRepository {
  /**
   * Create a new chat message
   * @param data Chat message data
   * @returns Created chat message
   */
  create(data: Omit<ChatMessage, "id">): Promise<ChatMessage>;

  /**
   * Find messages in a chat room
   * @param roomId Chat room ID
   * @param limit Maximum number of messages to return
   * @param before Get messages before this date
   * @returns Chat messages
   */
  findByRoomId(
    roomId: string,
    limit: number,
    before?: Date
  ): Promise<ChatMessage[]>;

  /**
   * Delete messages
   * @param messageIds IDs of messages to delete
   * @returns Number of deleted messages
   */
  delete(messageIds: string[]): Promise<number>;
}
