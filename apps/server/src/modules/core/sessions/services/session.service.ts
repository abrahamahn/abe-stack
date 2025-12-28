import { injectable, inject } from "inversify";
import { v4 as uuidv4 } from "uuid";

import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";
import { BaseService } from "@/server/modules/base/baseService";

import { Session, SessionInterface } from "../models/session.model";

/**
 * Options for session creation
 */
export interface SessionCreateOptions {
  /**
   * User ID
   */
  userId: string;

  /**
   * IP address
   */
  ipAddress: string;

  /**
   * User agent
   */
  userAgent: string;

  /**
   * Time to live in seconds (default: 24 hours)
   */
  ttl?: number;

  /**
   * Custom data associated with the session
   */
  data?: Record<string, any>;
}

/**
 * Service for managing user sessions
 */
@injectable()
export class SessionService extends BaseService {
  /**
   * In-memory store for sessions
   * @private
   */
  private sessions: Map<string, Session>;

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService);
    this.sessions = new Map<string, Session>();
  }

  /**
   * Create a new session
   * @param options - Session creation options
   */
  async createSession(options: SessionCreateOptions): Promise<Session> {
    const { userId, ipAddress, userAgent, ttl = 24 * 60 * 60, data } = options;

    const session = new Session({
      id: uuidv4(),
      userId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
      data,
      isActive: true,
    });

    // Store the session
    this.sessions.set(session.id, session);

    return session;
  }

  /**
   * Get a session by ID
   * @param id - Session ID
   */
  async getSession(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);

    // Check if session exists and is valid
    if (!session || !session.isActive || session.isExpired()) {
      return null;
    }

    return session;
  }

  /**
   * Get all sessions for a user
   * @param userId - User ID
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessions: Session[] = [];

    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        session.isActive &&
        !session.isExpired()
      ) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  /**
   * Refresh a session
   * @param id - Session ID
   * @param ttl - Time to live in seconds (default: 24 hours)
   */
  async refreshSession(
    id: string,
    ttl: number = 24 * 60 * 60
  ): Promise<Session | null> {
    const session = await this.getSession(id);

    if (!session) {
      return null;
    }

    // Update session
    session.refresh(ttl);
    this.sessions.set(id, session);

    return session;
  }

  /**
   * Invalidate a session
   * @param id - Session ID
   */
  async invalidateSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id);

    if (!session) {
      return false;
    }

    // Deactivate session
    session.deactivate();
    this.sessions.set(id, session);

    return true;
  }

  /**
   * Invalidate all sessions for a user
   * @param userId - User ID
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    let count = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isActive) {
        session.deactivate();
        this.sessions.set(id, session);
        count++;
      }
    }

    return count;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let count = 0;
    const now = new Date();

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        count++;
      }
    }

    return count;
  }
}
