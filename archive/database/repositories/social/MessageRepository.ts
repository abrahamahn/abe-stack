import { Message } from "@models/social/Message";

import { BaseRepository } from "../BaseRepository";

export class MessageRepository extends BaseRepository<Message> {
  protected tableName = "messages";
  protected columns = [
    "id",
    "conversation_id as conversationId",
    "sender_id as senderId",
    "content",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Message");
  }
}
