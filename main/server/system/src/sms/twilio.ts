// main/server/system/src/sms/twilio.ts
/**
 * Twilio SMS Provider
 *
 * Sends SMS messages via the Twilio REST API using fetch().
 * Requires accountSid, authToken, and fromNumber configuration.
 *
 * @module SMS
 */

import type { SmsOptions, SmsProvider, SmsResult } from './types';

// ============================================================================
// Types
// ============================================================================

/** Twilio provider configuration */
export interface TwilioConfig {
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Sender phone number in E.164 format */
  fromNumber: string;
}

/** Twilio API response for a successful message send */
interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code: number | null;
  error_message: string | null;
}

// ============================================================================
// Provider
// ============================================================================

export class TwilioSmsProvider implements SmsProvider {
  private readonly config: TwilioConfig;
  private readonly fetchFn: typeof fetch;

  constructor(config: TwilioConfig, fetchFn?: typeof fetch) {
    if (config.accountSid === '') {
      throw new Error('Twilio accountSid is required');
    }
    if (config.authToken === '') {
      throw new Error('Twilio authToken is required');
    }
    if (config.fromNumber === '') {
      throw new Error('Twilio fromNumber is required');
    }
    this.config = config;
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  async send(options: SmsOptions): Promise<SmsResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    const params = new URLSearchParams({
      To: options.to,
      From: this.config.fromNumber,
      Body: options.body,
    });

    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
      'base64',
    );

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Twilio API error (${String(response.status)}): ${errorText}`,
        };
      }

      const data = (await response.json()) as TwilioMessageResponse;

      if (data.error_code !== null) {
        return {
          success: false,
          error: `Twilio error ${String(data.error_code)}: ${data.error_message ?? 'Unknown error'}`,
        };
      }

      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending SMS',
      };
    }
  }
}
