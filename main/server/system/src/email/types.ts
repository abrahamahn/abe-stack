// main/server/system/src/email/types.ts
/**
 * Email Service Types
 *
 * Re-exports shared email types and the canonical EmailService port contract.
 */

import type { EmailOptions, EmailService, SendResult } from '@bslt/shared/system';

export type { EmailOptions, EmailService };

/** Alias for shared SendResult — maintains engine-local naming */
export type EmailResult = SendResult;

export interface AuthEmailTemplates {
  verifyEmail: (data: { link: string; email: string }) => {
    subject: string;
    html: string;
    text: string;
  };
  resetPassword: (data: { link: string; email: string }) => {
    subject: string;
    html: string;
    text: string;
  };
  magicLink: (data: { link: string; email: string }) => {
    subject: string;
    html: string;
    text: string;
  };
  emailChange: (data: { link: string; email: string }) => {
    subject: string;
    html: string;
    text: string;
  };
  invitation: (data: { link: string; email: string; inviterName: string; tenantName: string }) => {
    subject: string;
    html: string;
    text: string;
  };
}
