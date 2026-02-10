// src/server/engine/src/sms/factory.ts
/**
 * SMS Provider Factory
 *
 * Creates the appropriate SMS provider based on configuration.
 * Currently only console provider is implemented; Twilio/SNS
 * are stubs awaiting vendor selection and API key provisioning.
 *
 * @module SMS
 */

import { ConsoleSmsProvider } from './console';

import type { SmsConfig, SmsProvider } from './types';

/**
 * Create an SMS provider based on the given configuration.
 *
 * @param config - SMS service configuration
 * @returns An SmsProvider instance
 * @throws Error if an unsupported provider is specified
 */
export function createSmsProvider(config: SmsConfig): SmsProvider {
  if (!config.enabled) {
    return new ConsoleSmsProvider();
  }

  switch (config.provider) {
    case 'console':
      return new ConsoleSmsProvider();
    case 'twilio':
    case 'aws-sns':
      throw new Error(
        `SMS provider "${config.provider}" is not yet implemented. Use "console" for development.`,
      );
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unknown SMS provider: ${String(_exhaustive)}`);
    }
  }
}
