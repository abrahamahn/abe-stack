import { User } from "@models/auth";

/**
 * Registration request data
 */
export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Login request data
 */
export interface LoginDTO {
  email: string;
  password: string;
  mfaToken?: string;
}

/**
 * Password reset request data
 */
export interface PasswordResetRequestDTO {
  email: string;
}

/**
 * Password reset confirmation data
 */
export interface PasswordResetConfirmDTO {
  token: string;
  newPassword: string;
}

/**
 * Email verification data
 */
export interface EmailVerificationDTO {
  token: string;
}

/**
 * Authentication result containing user and token
 */
export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  requiresMFA?: boolean;
  sessionId?: string;
  tempToken?: string;
}

/**
 * Token payload structure
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface MFASetupDTO {
  secret: string;
  qrCode: string;
}

export interface LoginAttempt {
  timestamp: Date;
  successful: boolean;
}

export interface DeviceInfo {
  ip: string;
  userAgent: string;
  deviceId?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActiveAt: Date;
}
