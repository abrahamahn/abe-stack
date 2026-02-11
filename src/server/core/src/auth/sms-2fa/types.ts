// src/server/core/src/auth/sms-2fa/types.ts
/**
 * SMS 2FA Types
 *
 * Type definitions for SMS-based two-factor authentication.
 *
 * @module sms-2fa
 */

// ============================================================================
// Request/Response Types
// ============================================================================

/** Request to set/update phone number */
export interface SetPhoneRequest {
  /** Phone number in loose E.164-compatible format */
  phone: string;
}

/** Request to verify a phone number with an SMS code */
export interface VerifyPhoneRequest {
  /** 6-digit SMS verification code */
  code: string;
}

/** Request to send an SMS challenge code during login */
export interface SmsChallengeRequest {
  /** Challenge token from login flow */
  challengeToken: string;
}

/** Request to verify an SMS challenge code during login */
export interface SmsVerifyRequest {
  /** Challenge token from login flow */
  challengeToken: string;
  /** 6-digit SMS verification code */
  code: string;
}

// ============================================================================
// Service Types
// ============================================================================

/** Result of checking rate limits for SMS sending */
export interface SmsRateLimitResult {
  /** Whether the user is allowed to send another SMS */
  allowed: boolean;
  /** When the user can retry (if rate limited) */
  retryAfter?: Date | undefined;
}

/** SMS verification code stored in DB (camelCase) */
export interface SmsVerificationCode {
  id: string;
  userId: string;
  phone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

/** How long an SMS verification code is valid (in milliseconds) */
export const SMS_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum number of verification attempts per code */
export const SMS_MAX_ATTEMPTS = 3;

/** Maximum SMS sends per hour per user */
export const SMS_RATE_LIMIT_HOURLY = 3;

/** Maximum SMS sends per day per user */
export const SMS_RATE_LIMIT_DAILY = 10;
