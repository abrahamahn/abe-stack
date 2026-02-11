// src/server/engine/src/sms/factory.ts
/**
 * SMS Provider Factory
 *
 * Creates the appropriate SMS provider based on configuration.
 *
 * @module SMS
 */

import { ConsoleSmsProvider } from './console';
import { TwilioSmsProvider } from './twilio';

import type { TwilioConfig } from './twilio';
import type { SmsConfig, SmsProvider } from './types';

/**
 * Create an SMS provider based on the given configuration.
 *
 * @param config - SMS service configuration
 * @param twilioConfig - Optional Twilio-specific configuration (required when provider is 'twilio')
 * @returns An SmsProvider instance
 * @throws Error if an unsupported provider is specified
 */
export function createSmsProvider(config: SmsConfig, twilioConfig?: TwilioConfig): SmsProvider {
  if (!config.enabled) {
    return new ConsoleSmsProvider();
  }

  switch (config.provider) {
    case 'console':
      return new ConsoleSmsProvider();
    case 'twilio': {
      if (twilioConfig === undefined) {
        throw new Error(
          'Twilio configuration (accountSid, authToken, fromNumber) is required when using the Twilio provider.',
        );
      }
      return new TwilioSmsProvider(twilioConfig);
    }
    case 'aws-sns':
      throw new Error(
        `SMS provider "aws-sns" is not yet implemented. Use "console" for development.`,
      );
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unknown SMS provider: ${String(_exhaustive)}`);
    }
  }
}
