// apps/server/src/shared/types.ts

import type { QueueServer, ServerSearchProvider, WriteService } from '@/infrastructure/index';
import type {
  AppConfig,
  BillingService,
  EmailService,
  NotificationService,
  StorageService as StorageProvider,
  SubscriptionManager,
  UserRole as CoreUserRole,
} from '@abe-stack/core';
import type { DbClient, Repositories } from '@abe-stack/db';
import type { FastifyBaseLogger } from 'fastify';

// ============================================================================
// User Types
// ============================================================================

export type UserRole = CoreUserRole;

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
  userAgent: string | undefined;
  deviceId?: string;
}

// ============================================================================
// Fastify Request/Reply Extensions
// ============================================================================

export interface ReplyWithCookies {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

export interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: {
    authorization?: string | undefined;
    'user-agent'?: string | undefined;
    [key: string]: string | string[] | undefined;
  };
  /** Client IP address (from Fastify's request.ip, respects trustProxy) */
  ip?: string | undefined;
  user?: { userId: string; email: string; role: string } | undefined;
  /** Request info extracted by middleware (IP address, user agent) */
  requestInfo: RequestInfo;
  /** Start time for request timing in development (bigint from process.hrtime.bigint()) */
  requestStart?: bigint | undefined;
  /** Application Context (Hybrid Pattern) - Available on request via hook */
  context?: AppContext | undefined;
}

// ============================================================================
// Service Interfaces (Ports)
// ============================================================================

/**
 * Storage provider interface (Alias for core StorageService)
 */
export type { StorageProvider };

// ============================================================================
// Service Container Interface (Composition Root)
// ============================================================================

/**
 * Service Container Interface
 *
 * Defines the contract for the application's dependency injection container.
 * The App class implements this interface, providing a single source of truth
 * for all infrastructure services.
 */
export interface IServiceContainer {
  /** Application configuration */
  readonly config: AppConfig;

  /** Database client (raw SQL query builder) */
  readonly db: DbClient;

  /** Database repositories */
  readonly repos: Repositories;

  /** Email service for sending notifications */
  readonly email: EmailService;

  /** Storage provider for file uploads */
  readonly storage: StorageProvider;

  /** Pub/sub manager for real-time subscriptions */
  readonly pubsub: SubscriptionManager;

  /** Cache service for performance optimization */
  readonly cache: import('../services/cache-service').CacheService;

  /** Billing provider for payments/subscriptions */
  readonly billing: BillingService;

  /** Notification service for push/email */
  readonly notifications: NotificationService;

  /** Background job queue server */
  readonly queue: QueueServer;

  /** Unified write service (Chet-stack pattern) */
  readonly write: WriteService;

  /** Server-side search provider */
  readonly search: ServerSearchProvider;
}

/**
 * Interface for services that provide an AppContext
 */
export interface HasContext {
  readonly context: AppContext;
}

// ============================================================================
// App Context (Handler Interface)
// ============================================================================

/**
 * Application context passed to all handlers
 * This is what handlers receive - a clean interface to all services.
 * Extends IServiceContainer with runtime-specific dependencies (logger).
 */
export interface AppContext extends IServiceContainer {
  /** Logger instance (from Fastify) */
  log: FastifyBaseLogger;
}
