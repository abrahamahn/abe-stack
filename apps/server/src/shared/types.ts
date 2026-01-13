// apps/server/src/shared/types.ts
/**
 * Shared type definitions
 * Framework-agnostic types used across the application
 */

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'user' | 'admin' | 'moderator';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

// ============================================================================
// Token Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenData {
  token: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface OAuthUserInfo {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

export interface MagicLinkData {
  token: string;
  email: string;
  expiresAt: Date;
  used: boolean;
}

export interface TotpSecret {
  secret: string;
  uri: string;
  qrCode?: string;
}

// ============================================================================
// Request Context
// ============================================================================

export interface RequestInfo {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
}

// ============================================================================
// Service Interfaces (Ports)
// ============================================================================

/**
 * Logger interface - abstracts away the actual logger implementation
 */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Email service interface
 */
export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}

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

/**
 * Storage service interface
 */
export interface StorageService {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

// ============================================================================
// App Context (DI Container Output)
// ============================================================================

import type { AppConfig } from '../config';
import type { DbClient } from '../infra/database';
import type { StorageProvider } from '../infra/storage';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Application context passed to all handlers
 * This is what handlers receive - a clean interface to all services
 */
export interface AppContext {
  config: AppConfig;
  db: DbClient;
  email: EmailService;
  storage: StorageProvider;
  log: FastifyBaseLogger;
}
