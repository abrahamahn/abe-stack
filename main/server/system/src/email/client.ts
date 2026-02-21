// main/server/system/src/email/client.ts
/**
 * Mailer Client
 *
 * High-level email service facade that selects the underlying transport
 * (SMTP or console) based on environment configuration.
 *
 * Includes an optional SMTP health check on server boot via `verifyOnBoot()`.
 */

import { EmailSendError } from '@bslt/shared/system';

import { ConsoleEmailService } from './console';
import { SmtpEmailService } from './smtp';

import type { EmailConfig, FullEnv } from '../config';
import type { EmailOptions, EmailResult, EmailService } from './types';

export class MailerClient implements EmailService {
  private readonly service: EmailService;

  constructor(config: FullEnv) {
    // FullEnv includes EMAIL_PROVIDER in validated runtime paths, but keep this optional
    // for non-validated contexts (tests, scripts) where a partial env may be passed.
    const provider = (config as Partial<Pick<FullEnv, 'EMAIL_PROVIDER'>>).EMAIL_PROVIDER;
    const smtpHost: string | undefined = config.SMTP_HOST;
    const isDevWithoutSmtp =
      config.NODE_ENV === 'development' && (smtpHost === undefined || smtpHost === '');

    // EMAIL_PROVIDER takes precedence when explicitly configured.
    if (provider === 'console') {
      this.service = new ConsoleEmailService();
      return;
    }

    if (provider === 'smtp' && (smtpHost === undefined || smtpHost === '')) {
      throw new Error('EMAIL_PROVIDER=smtp requires SMTP_HOST to be set');
    }

    // Backward-compatible fallback when provider is absent in non-validated contexts.
    if (isDevWithoutSmtp || smtpHost === undefined || smtpHost === '') {
      this.service = new ConsoleEmailService();
      return;
    }

    const smtpPort: number = config.SMTP_PORT ?? 587;
    const smtpUser: string | undefined = config.SMTP_USER;
    const smtpPass: string = config.SMTP_PASS ?? '';
    const fromEmail: string = config.EMAIL_FROM_ADDRESS ?? 'noreply@example.com';

    const smtpOptions: EmailConfig['smtp'] = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      connectionTimeout: 30000,
      socketTimeout: 60000,
    };
    if (smtpUser !== undefined && smtpUser !== '') {
      smtpOptions.auth = { user: smtpUser, pass: smtpPass };
    }

    const emailConfig: EmailConfig = {
      provider: 'smtp',
      smtp: smtpOptions,
      from: {
        address: fromEmail,
        name: 'Abe Stack',
      },
      replyTo: fromEmail,
    };
    this.service = new SmtpEmailService(emailConfig);
  }

  healthCheck(): Promise<boolean> {
    return this.service.healthCheck();
  }

  /**
   * Verify SMTP connectivity on server boot.
   *
   * Performs a non-blocking health check against the configured SMTP server.
   * Logs the result and returns `{ ok, message }` — does NOT throw on failure
   * so the server can still start (email may recover later).
   *
   * @param log - Optional structured logger (falls back to stdout)
   * @returns `{ ok: true }` when SMTP is reachable, `{ ok: false, message }` otherwise
   * @complexity O(1) - single TCP connection attempt
   */
  async verifyOnBoot(log?: {
    info: (msg: string) => void;
    warn: (obj: Record<string, unknown>, msg: string) => void;
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const healthy = await this.healthCheck();
      if (healthy) {
        if (log !== undefined) {
          log.info('SMTP health check passed — email delivery is available');
        }
        return { ok: true };
      }
      const msg = 'SMTP health check failed — email delivery may be unavailable';
      if (log !== undefined) {
        log.warn({ service: 'email' }, msg);
      }
      return { ok: false, message: msg };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown SMTP error';
      const msg = `SMTP health check error: ${errorMsg}`;
      if (log !== undefined) {
        log.warn({ service: 'email', error: errorMsg }, msg);
      }
      return { ok: false, message: msg };
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const result = await this.service.send(options);
    if (!result.success) {
      throw new EmailSendError(result.error ?? 'Failed to send email');
    }
    return result;
  }
}
