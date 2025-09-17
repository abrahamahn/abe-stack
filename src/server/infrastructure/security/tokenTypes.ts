/**
 * Token payload interface for JWT tokens
 */
export interface TokenPayload {
  /** Unique identifier for the user */
  userId: string;
  /** User email address */
  email?: string;
  /** Array of user roles/permissions */
  roles?: string[];
  /** Session identifier for tracking multiple logins */
  sessionId?: string;
  /** Unique identifier for the token (JWT ID) */
  tokenId?: string;
  /** Type of token (access, refresh, etc.) */
  type?: "access" | "refresh" | "temp";
  /** Information about the device that requested the token */
  deviceInfo?: {
    /** Client IP address */
    ip: string;
    /** User agent string */
    userAgent: string;
    /** Optional device identifier */
    deviceId?: string;
    /** Optional platform information (e.g., "web", "ios", "android") */
    platform?: string;
  };
  /** Token issuance timestamp */
  issuedAt?: number;
  /** Token expiration timestamp */
  expiresAt?: number;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Token types used in the application
 */
export enum TokenType {
  /** Short-lived token used for API authentication */
  ACCESS = "access",

  /** Long-lived token used to obtain new access tokens */
  REFRESH = "refresh",

  /** One-time token for password reset operations */
  PASSWORD_RESET = "password_reset",

  /** One-time token for email verification */
  EMAIL_VERIFICATION = "email_verification",

  /** Temporary token for multi-step operations */
  TEMP = "temp",

  /** Token used for API key authentication */
  API_KEY = "api_key",

  /** Token used for single sign-on */
  SSO = "sso",

  /** Token used for passwordless login */
  PASSWORDLESS = "passwordless",
}

/**
 * Options for token creation
 */
export interface TokenOptions {
  /** Token expiration time (e.g., "1h", "7d", 3600) */
  expiresIn?: string | number;
  /** Intended recipients of the token */
  audience?: string | string[];
  /** Token issuer */
  issuer?: string;
  /** Token subject (typically userId) */
  subject?: string;
  /** Custom JWT ID */
  jwtid?: string;
  /** Not valid before time */
  notBefore?: string | number;
  /** Token algorithm (default: HS256) */
  algorithm?: string;
}

/**
 * Access and refresh token pair
 */
export interface TokenPair {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Expiration time in seconds */
  expiresIn: number;
  /** Time when token was issued (timestamp) */
  issuedAt?: number;
  /** Token type (Bearer) */
  tokenType?: string;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded token payload (if valid) */
  payload?: TokenPayload;
  /** Error message (if invalid) */
  error?: string;
  /** Additional information about the error */
  errorCode?: string;
  /** Token expiration time in seconds (if valid) */
  expiresIn?: number;
}

/**
 * Token revocation reason types
 */
export enum TokenRevocationReason {
  /** User logged out */
  LOGOUT = "logout",
  /** Token was compromised */
  SECURITY_BREACH = "security_breach",
  /** User's credentials or password changed */
  CREDENTIALS_CHANGED = "credentials_changed",
  /** User's account was disabled */
  ACCOUNT_DISABLED = "account_disabled",
  /** Administrator revoked the token */
  ADMIN_REVOKED = "admin_revoked",
  /** Suspicious activity detected */
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
}

/**
 * Additional metadata for a token
 */
export interface TokenMetadata {
  /** Custom user information */
  userInfo?: Record<string, any>;
  /** Client IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Device information */
  device?: string;
  /** Geolocation data */
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  /** Custom purpose for the token */
  purpose?: string;
  /** Action scope (e.g., specific resources the token can access) */
  scope?: string[];
}

/**
 * Utility functions for working with tokens
 */
export const TokenUtils = {
  /**
   * Format a token pair for response
   * @param accessToken Access token string
   * @param refreshToken Refresh token string
   * @param expiresIn Expiration time in seconds
   * @returns Formatted token pair object
   */
  formatTokenPair(
    accessToken: string,
    refreshToken: string,
    expiresIn: number = 3600
  ): TokenPair {
    return {
      accessToken,
      refreshToken,
      expiresIn,
      issuedAt: Math.floor(Date.now() / 1000),
      tokenType: "Bearer",
    };
  },

  /**
   * Extract token from authorization header
   * @param authHeader Authorization header value
   * @returns Token or null if not found/invalid
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    // Check for Bearer token format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1];
  },

  /**
   * Create a basic payload for a token
   * @param userId User ID
   * @param roles User roles
   * @param type Token type
   * @param expiresIn Token expiration in seconds
   * @returns Token payload object
   */
  createBasicPayload(
    userId: string,
    roles: string[] = [],
    type: "access" | "refresh" | "temp" = "access",
    expiresIn: number = 3600
  ): TokenPayload {
    const now = Math.floor(Date.now() / 1000);

    return {
      userId,
      roles,
      type,
      issuedAt: now,
      expiresAt: now + expiresIn,
    };
  },

  /**
   * Determine if a token is expired
   * @param payload Token payload with expiration
   * @param buffer Buffer time in seconds to consider a token as expired earlier
   * @returns Whether the token is expired
   */
  isTokenExpired(payload: TokenPayload, buffer: number = 0): boolean {
    if (!payload.expiresAt) return false;

    const now = Math.floor(Date.now() / 1000);
    return payload.expiresAt <= now + buffer;
  },
};
