// src/server/core/src/auth/sms-2fa/index.ts
/**
 * SMS 2FA Module
 *
 * Provides SMS-based two-factor authentication services.
 *
 * @module sms-2fa
 */

export { checkSmsRateLimit } from './rate-limit';
export { getSmsVerificationCode, sendSms2faCode, verifySms2faCode } from './service';
export {
  SMS_CODE_EXPIRY_MS,
  SMS_MAX_ATTEMPTS,
  SMS_RATE_LIMIT_DAILY,
  SMS_RATE_LIMIT_HOURLY,
  type SetPhoneRequest,
  type SmsChallengeRequest,
  type SmsRateLimitResult,
  type SmsVerificationCode,
  type SmsVerifyRequest,
  type VerifyPhoneRequest,
} from './types';
