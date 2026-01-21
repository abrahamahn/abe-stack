// apps/server/src/infrastructure/messaging/index.ts
/**
 * Messaging Layer
 *
 * Communication channels:
 * - email: Email sending services
 * - pubsub: Real-time subscription management (Postgres NOTIFY/LISTEN)
 * - websocket: WebSocket connection handling
 */

// Email
export {
  ConsoleEmailService,
  createEmailService,
  emailTemplates,
  SmtpClient,
  SmtpEmailService,
  type EmailOptions,
  type EmailResult,
  type EmailService,
  type SmtpConfig,
  type SmtpMessage,
  type SmtpResult,
} from './email';

// PubSub
export {
  createPostgresPubSub,
  PostgresPubSub,
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
  type ClientMessage,
  type ListKey,
  type PostgresPubSubOptions,
  type PubSubMessage,
  type RecordKey,
  type ServerMessage,
  type SubscriptionKey,
  type SubscriptionManagerOptions,
  type WebSocket,
} from './pubsub';

// WebSocket
export { getWebSocketStats, registerWebSocket, type WebSocketStats } from './websocket';
