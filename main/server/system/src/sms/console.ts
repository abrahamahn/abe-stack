// main/server/system/src/sms/console.ts
/**
 * Console SMS Provider (Development)
 *
 * Logs SMS content to console instead of sending.
 * Use this in development to see SMS output without a real provider.
 *
 * @module SMS
 */

import { generateSecureId } from '@bslt/shared';

import type { SmsOptions, SmsProvider, SmsResult } from './types';

type LogFn = (message: string) => void;

const defaultLog: LogFn = (message: string) => {
  process.stdout.write(`${message}\n`);
};

export class ConsoleSmsProvider implements SmsProvider {
  private readonly log: LogFn;

  constructor(log?: LogFn) {
    this.log = log ?? defaultLog;
  }

  send(options: SmsOptions): Promise<SmsResult> {
    const messageId = `sms-dev-${String(Date.now())}-${generateSecureId(9)}`;

    this.log('\n--- SMS (Development Mode - Not Sent) ---');
    this.log(`  To:   ${options.to}`);
    this.log(`  Body: ${options.body}`);
    this.log(`  ID:   ${messageId}`);
    this.log('------------------------------------------\n');

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}
