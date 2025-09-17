import { Request, Response } from "express";

import {
  GetSessionsResponseDto,
  SessionDto,
  TerminateAllSessionsResponseDto,
  TerminateSessionResponseDto,
} from "../dtos";
import { SessionService } from "../SessionService";

/**
 * Controller for managing user sessions
 */
export class SessionController {
  private sessionService: SessionService;

  /**
   * Constructor
   */
  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Get user's active sessions
   * GET /api/sessions
   */
  async getSessions(
    req: Request,
    res: Response<GetSessionsResponseDto>
  ): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({
          sessions: [],
        });
        return;
      }

      // In a real implementation, this would use the session service
      // For now, simulate sessions
      const mockSessions: SessionDto[] = [
        {
          id: "session-1",
          userId: req.user.id,
          deviceInfo: {
            type: "desktop",
            browser: "Chrome",
            os: "Windows",
            ip: req.ip || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "Unknown",
          },
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isCurrent: true,
        },
        {
          id: "session-2",
          userId: req.user.id,
          deviceInfo: {
            type: "mobile",
            browser: "Safari",
            os: "iOS",
            ip: "192.168.1.2",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
          },
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          lastActiveAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          isCurrent: false,
        },
      ];

      res.status(200).json({
        sessions: mockSessions,
      });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({
        sessions: [],
      });
    }
  }

  /**
   * Terminate a specific session
   * DELETE /api/sessions/:sessionId
   */
  async terminateSession(
    req: Request<{ sessionId: string }>,
    res: Response<TerminateSessionResponseDto>
  ): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Check if trying to terminate current session
      if (sessionId === req.sessionId) {
        res.status(400).json({
          success: false,
          message: "Cannot terminate current session. Use logout instead.",
        });
        return;
      }

      // In a real implementation, this would use the session service
      // For now, simulate session termination
      res.status(200).json({
        success: true,
        message: `Session ${sessionId} terminated successfully`,
      });
    } catch (error) {
      console.error("Error terminating session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to terminate session",
      });
    }
  }

  /**
   * Terminate all sessions except the current one
   * DELETE /api/sessions
   */
  async terminateAllSessions(
    req: Request,
    res: Response<TerminateAllSessionsResponseDto>
  ): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          terminatedCount: 0,
        });
        return;
      }

      // In a real implementation, this would use the session service
      // For now, simulate terminating all other sessions
      res.status(200).json({
        success: true,
        message: "All other sessions terminated successfully",
        terminatedCount: 2,
      });
    } catch (error) {
      console.error("Error terminating all sessions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to terminate sessions",
        terminatedCount: 0,
      });
    }
  }
}
