// apps/server/src/infrastructure/messaging/index.ts
/**
 * Messaging Layer
 *
 * Communication channels:
 * - email: Email sending services
 * - websocket: WebSocket connection handling
 *
 * Note: PubSub should be imported directly from @abe-stack/core/pubsub
 */

// Email
export {
  ConsoleEmailService,
  SmtpClient,
  SmtpEmailService,
  createEmailService,
  emailTemplates,
  type EmailOptions,
  type EmailResult,
  type EmailService,
  type SmtpConfig,
  type SmtpMessage,
  type SmtpResult,
} from './email';

// WebSocket
export { getWebSocketStats, registerWebSocket, type WebSocketStats } from './websocket';
