/**
 * Session data transfer object
 */
export interface SessionDto {
  /**
   * Session ID
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Device information
   */
  deviceInfo: {
    /**
     * Device type
     */
    type: string;

    /**
     * Browser information
     */
    browser?: string;

    /**
     * Operating system
     */
    os?: string;

    /**
     * IP address
     */
    ip?: string;

    /**
     * User agent string
     */
    userAgent?: string;
  };

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last active timestamp
   */
  lastActiveAt: string;

  /**
   * Whether this is the current session
   */
  isCurrent: boolean;
}

/**
 * Get sessions response data transfer object
 */
export interface GetSessionsResponseDto {
  /**
   * List of sessions
   */
  sessions: SessionDto[];
}

/**
 * Terminate session response data transfer object
 */
export interface TerminateSessionResponseDto {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * Terminate all sessions response data transfer object
 */
export interface TerminateAllSessionsResponseDto {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * Number of terminated sessions
   */
  terminatedCount: number;
}
