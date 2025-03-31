export interface WebSocketMessage {
  type: string;
  eventType?: string;
  channel?: string;
  data?: unknown;
  messageId?: string;
  error?: string;
}
