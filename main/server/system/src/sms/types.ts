// main/server/system/src/sms/types.ts
/**
 * SMS Service Types
 *
 * Core type definitions for the SMS/phone verification service.
 * Designed for pluggable providers (Twilio, AWS SNS, etc.)
 *
 * @module SMS
 */

// ============================================================================
// Types
// ============================================================================

/** Options for sending an SMS message */
export interface SmsOptions {
  /** Recipient phone number in E.164 format (e.g., +15551234567) */
  to: string;
  /** SMS message body */
  body: string;
}

/** Result of an SMS sending operation */
export interface SmsResult {
  /** Whether the SMS was sent successfully */
  success: boolean;
  /** Message ID from the SMS provider (if available) */
  messageId?: string | undefined;
  /** Error message if sending failed */
  error?: string | undefined;
}

/** SMS provider interface — implement for each vendor (Twilio, AWS SNS, etc.) */
export interface SmsProvider {
  /**
   * Send an SMS message.
   * @param options - SMS sending options
   * @returns Promise resolving to SMS result
   */
  send(options: SmsOptions): Promise<SmsResult>;
}

/** SMS service configuration */
export interface SmsConfig {
  /** Whether SMS features are enabled */
  enabled: boolean;
  /** Provider name (for factory selection) */
  provider: 'console' | 'twilio' | 'aws-sns';
  /** Sender phone number or short code in E.164 format */
  from?: string | undefined;
}
