export interface DeviceInfo {
  ip: string;
  userAgent: string;
  platform?: string;
  browser?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActiveAt: Date;
}

export class SessionManager {
  private sessions = new Map<string, SessionInfo>();

  async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<SessionInfo> {
    const id = Math.random().toString(36).substring(2);
    const session: SessionInfo = {
      id,
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  async terminateSession(userId: string, sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session && session.userId === userId) {
      return this.sessions.delete(sessionId);
    }
    return false;
  }

  async terminateOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<boolean> {
    let terminated = false;
    this.sessions.forEach((session, id) => {
      if (session.userId === userId && id !== currentSessionId) {
        this.sessions.delete(id);
        terminated = true;
      }
    });
    return terminated;
  }
}
