// src/server/engine/src/mailer/types.ts
/**
 * Email Service Types
 *
 * Re-exports shared email types and defines engine-specific EmailService
 * (without healthCheck requirement from the shared port contract).
 */

import type { EmailOptions, SendResult } from '@abe-stack/shared';

export type { EmailOptions };

/** Alias for shared SendResult — maintains engine-local naming */
export type EmailResult = SendResult;

/**
 * Engine-specific email service interface.
 * Simpler than the shared port contract (no healthCheck requirement).
 */
export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}
