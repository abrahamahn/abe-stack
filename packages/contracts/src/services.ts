// packages/contracts/src/services.ts
/**
 * Service Interfaces (Ports)
 *
 * Defines the abstract contracts for infrastructure services ("Ports" in Hexagonal Architecture).
 *
 * **Architectural Goal**:
 * To allow the Core domain logic to depend on these interfaces without knowing about highly
 * coupled implementations (like AWS S3, SendGrid, or specific Logging libraries).
 *
 * @remarks
 * Implementations ("Adapters") reside in the `infrastructure` layer or `apps/server`.
 */

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Generic Logger interface
 */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  trace?(msg: string, data?: Record<string, unknown>): void;
  fatal?(msg: string | Error, data?: Record<string, unknown>): void;
  child?(bindings: Record<string, unknown>): Logger;
}

// ============================================================================
// Email Service
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: { name: string; address: string };
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}

// ============================================================================
// Storage Service
// ============================================================================

export interface StorageService {
  upload(key: string, data: Uint8Array | string, contentType: string): Promise<string>;
  download(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

// ============================================================================
// Notification Service
// ============================================================================

export interface NotificationService {
  isConfigured(): boolean;
  getFcmProvider?(): unknown;
}
