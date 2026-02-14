// main/shared/src/domain/email/email.schemas.test.ts

/**
 * @file Unit Tests for Email Domain Schemas
 * @description Tests for email template and delivery log validation schemas.
 * @module Domain/Email
 */

import { describe, expect, it } from 'vitest';

import {
  createEmailLogEntrySchema,
  createEmailTemplateSchema,
  emailLogEntrySchema,
  emailProviderSchema,
  emailStatusSchema,
  emailTemplateSchema,
  updateEmailTemplateSchema,
  type CreateEmailLogEntry,
  type CreateEmailTemplate,
  type EmailLogEntry,
  type EmailTemplate,
  type UpdateEmailTemplate,
} from './email.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_TEMPLATE_KEY = 'auth.welcome';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_EMAIL_TEMPLATE = {
  key: VALID_TEMPLATE_KEY,
  name: 'Welcome Email',
  subject: 'Welcome to ABE Stack',
  bodyHtml: '<h1>Welcome!</h1>',
  bodyText: 'Welcome!',
  variables: { userName: 'string', appUrl: 'string' },
  isActive: true,
  createdAt: VALID_ISO,
  updatedAt: VALID_ISO,
};

const VALID_EMAIL_LOG_ENTRY = {
  id: VALID_UUID,
  userId: VALID_UUID,
  templateKey: VALID_TEMPLATE_KEY,
  recipient: 'user@example.com',
  subject: 'Test Email',
  status: 'sent' as const,
  provider: 'smtp' as const,
  providerMessageId: 'msg-123',
  sentAt: VALID_ISO,
  deliveredAt: VALID_ISO,
  bouncedAt: null,
  errorMessage: null,
  metadata: { campaignId: 'welcome-001' },
  createdAt: VALID_ISO,
};

// ============================================================================
// emailStatusSchema
// ============================================================================

describe('emailStatusSchema', () => {
  describe('valid inputs', () => {
    it('should accept "queued"', () => {
      expect(emailStatusSchema.parse('queued')).toBe('queued');
    });

    it('should accept "sent"', () => {
      expect(emailStatusSchema.parse('sent')).toBe('sent');
    });

    it('should accept "delivered"', () => {
      expect(emailStatusSchema.parse('delivered')).toBe('delivered');
    });

    it('should accept "bounced"', () => {
      expect(emailStatusSchema.parse('bounced')).toBe('bounced');
    });

    it('should accept "failed"', () => {
      expect(emailStatusSchema.parse('failed')).toBe('failed');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid status', () => {
      expect(() => emailStatusSchema.parse('invalid')).toThrow();
    });

    it('should reject non-string', () => {
      expect(() => emailStatusSchema.parse(123)).toThrow();
    });
  });
});

// ============================================================================
// emailProviderSchema
// ============================================================================

describe('emailProviderSchema', () => {
  describe('valid inputs', () => {
    it('should accept "smtp"', () => {
      expect(emailProviderSchema.parse('smtp')).toBe('smtp');
    });

    it('should accept "ses"', () => {
      expect(emailProviderSchema.parse('ses')).toBe('ses');
    });

    it('should accept "sendgrid"', () => {
      expect(emailProviderSchema.parse('sendgrid')).toBe('sendgrid');
    });

    it('should accept "console"', () => {
      expect(emailProviderSchema.parse('console')).toBe('console');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid provider', () => {
      expect(() => emailProviderSchema.parse('mailgun')).toThrow();
    });

    it('should reject non-string', () => {
      expect(() => emailProviderSchema.parse(null)).toThrow();
    });
  });
});

// ============================================================================
// emailTemplateSchema
// ============================================================================

describe('emailTemplateSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full email template', () => {
      const result: EmailTemplate = emailTemplateSchema.parse(VALID_EMAIL_TEMPLATE);

      expect(result.key).toBe(VALID_TEMPLATE_KEY);
      expect(result.name).toBe('Welcome Email');
      expect(result.subject).toBe('Welcome to ABE Stack');
      expect(result.bodyHtml).toBe('<h1>Welcome!</h1>');
      expect(result.bodyText).toBe('Welcome!');
      expect(result.variables).toEqual({ userName: 'string', appUrl: 'string' });
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: EmailTemplate = emailTemplateSchema.parse({
        ...VALID_EMAIL_TEMPLATE,
        bodyHtml: null,
        bodyText: null,
      });

      expect(result.bodyHtml).toBeNull();
      expect(result.bodyText).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: EmailTemplate = emailTemplateSchema.parse(VALID_EMAIL_TEMPLATE);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: EmailTemplate = emailTemplateSchema.parse({
        ...VALID_EMAIL_TEMPLATE,
        createdAt: VALID_DATE,
        updatedAt: VALID_DATE,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept false for isActive', () => {
      const result: EmailTemplate = emailTemplateSchema.parse({
        ...VALID_EMAIL_TEMPLATE,
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid key', () => {
      expect(() => emailTemplateSchema.parse({ ...VALID_EMAIL_TEMPLATE, key: '' })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() =>
        emailTemplateSchema.parse({ ...VALID_EMAIL_TEMPLATE, name: undefined }),
      ).toThrow();
    });

    it('should reject missing subject', () => {
      expect(() =>
        emailTemplateSchema.parse({ ...VALID_EMAIL_TEMPLATE, subject: undefined }),
      ).toThrow();
    });

    it('should reject invalid date for createdAt', () => {
      expect(() =>
        emailTemplateSchema.parse({ ...VALID_EMAIL_TEMPLATE, createdAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => emailTemplateSchema.parse(null)).toThrow();
      expect(() => emailTemplateSchema.parse('string')).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => emailTemplateSchema.parse({})).toThrow();
    });
  });
});

// ============================================================================
// createEmailTemplateSchema
// ============================================================================

describe('createEmailTemplateSchema', () => {
  describe('valid inputs', () => {
    it('should parse with required fields only', () => {
      const result: CreateEmailTemplate = createEmailTemplateSchema.parse({
        key: 'test.template',
        name: 'Test Template',
        subject: 'Test Subject',
      });

      expect(result.key).toBe('test.template');
      expect(result.name).toBe('Test Template');
      expect(result.subject).toBe('Test Subject');
      expect(result.bodyHtml).toBeUndefined();
      expect(result.bodyText).toBeUndefined();
      expect(result.variables).toBeUndefined();
      expect(result.isActive).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateEmailTemplate = createEmailTemplateSchema.parse({
        key: 'test.template',
        name: 'Test Template',
        subject: 'Test Subject',
        bodyHtml: '<p>HTML</p>',
        bodyText: 'Text',
        variables: { foo: 'bar' },
        isActive: true,
      });

      expect(result.bodyHtml).toBe('<p>HTML</p>');
      expect(result.bodyText).toBe('Text');
      expect(result.variables).toEqual({ foo: 'bar' });
      expect(result.isActive).toBe(true);
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateEmailTemplate = createEmailTemplateSchema.parse({
        key: 'test.template',
        name: 'Test Template',
        subject: 'Test Subject',
        bodyHtml: null,
        bodyText: null,
      });

      expect(result.bodyHtml).toBeNull();
      expect(result.bodyText).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing key', () => {
      expect(() => createEmailTemplateSchema.parse({ name: 'Test', subject: 'Test' })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => createEmailTemplateSchema.parse({ key: 'test', subject: 'Test' })).toThrow();
    });

    it('should reject missing subject', () => {
      expect(() => createEmailTemplateSchema.parse({ key: 'test', name: 'Test' })).toThrow();
    });
  });
});

// ============================================================================
// updateEmailTemplateSchema
// ============================================================================

describe('updateEmailTemplateSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty update (no changes)', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({});

      expect(result.name).toBeUndefined();
      expect(result.subject).toBeUndefined();
      expect(result.isActive).toBeUndefined();
    });

    it('should parse with name only', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should parse with subject only', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({
        subject: 'Updated Subject',
      });

      expect(result.subject).toBe('Updated Subject');
    });

    it('should parse with isActive toggle', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should accept null for nullable fields', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({
        bodyHtml: null,
        bodyText: null,
      });

      expect(result.bodyHtml).toBeNull();
      expect(result.bodyText).toBeNull();
    });

    it('should parse with all fields', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse({
        name: 'New Name',
        subject: 'New Subject',
        bodyHtml: '<p>New HTML</p>',
        bodyText: 'New Text',
        variables: { newVar: 'value' },
        isActive: true,
      });

      expect(result.name).toBe('New Name');
      expect(result.subject).toBe('New Subject');
      expect(result.bodyHtml).toBe('<p>New HTML</p>');
      expect(result.bodyText).toBe('New Text');
      expect(result.variables).toEqual({ newVar: 'value' });
      expect(result.isActive).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should coerce non-object input to empty update', () => {
      const result: UpdateEmailTemplate = updateEmailTemplateSchema.parse(null);
      expect(result.name).toBeUndefined();
      expect(result.subject).toBeUndefined();
    });
  });
});

// ============================================================================
// emailLogEntrySchema
// ============================================================================

describe('emailLogEntrySchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full email log entry', () => {
      const result: EmailLogEntry = emailLogEntrySchema.parse(VALID_EMAIL_LOG_ENTRY);

      expect(result.id).toBe(VALID_UUID);
      expect(result.userId).toBe(VALID_UUID);
      expect(result.templateKey).toBe(VALID_TEMPLATE_KEY);
      expect(result.recipient).toBe('user@example.com');
      expect(result.subject).toBe('Test Email');
      expect(result.status).toBe('sent');
      expect(result.provider).toBe('smtp');
      expect(result.providerMessageId).toBe('msg-123');
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.deliveredAt).toBeInstanceOf(Date);
      expect(result.bouncedAt).toBeNull();
      expect(result.errorMessage).toBeNull();
      expect(result.metadata).toEqual({ campaignId: 'welcome-001' });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: EmailLogEntry = emailLogEntrySchema.parse({
        ...VALID_EMAIL_LOG_ENTRY,
        userId: null,
        templateKey: null,
        providerMessageId: null,
        sentAt: null,
        deliveredAt: null,
        bouncedAt: null,
        errorMessage: null,
      });

      expect(result.userId).toBeNull();
      expect(result.templateKey).toBeNull();
      expect(result.providerMessageId).toBeNull();
      expect(result.sentAt).toBeNull();
      expect(result.deliveredAt).toBeNull();
      expect(result.bouncedAt).toBeNull();
      expect(result.errorMessage).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: EmailLogEntry = emailLogEntrySchema.parse(VALID_EMAIL_LOG_ENTRY);

      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.deliveredAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept all valid statuses', () => {
      const statuses = ['queued', 'sent', 'delivered', 'bounced', 'failed'] as const;
      statuses.forEach((status) => {
        const result: EmailLogEntry = emailLogEntrySchema.parse({
          ...VALID_EMAIL_LOG_ENTRY,
          status,
        });
        expect(result.status).toBe(status);
      });
    });

    it('should accept all valid providers', () => {
      const providers = ['smtp', 'ses', 'sendgrid', 'console'] as const;
      providers.forEach((provider) => {
        const result: EmailLogEntry = emailLogEntrySchema.parse({
          ...VALID_EMAIL_LOG_ENTRY,
          provider,
        });
        expect(result.provider).toBe(provider);
      });
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => emailLogEntrySchema.parse({ ...VALID_EMAIL_LOG_ENTRY, id: 'bad' })).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() =>
        emailLogEntrySchema.parse({ ...VALID_EMAIL_LOG_ENTRY, status: 'invalid' }),
      ).toThrow();
    });

    it('should reject invalid provider', () => {
      expect(() =>
        emailLogEntrySchema.parse({ ...VALID_EMAIL_LOG_ENTRY, provider: 'invalid' }),
      ).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => emailLogEntrySchema.parse({})).toThrow();
    });
  });
});

// ============================================================================
// createEmailLogEntrySchema
// ============================================================================

describe('createEmailLogEntrySchema', () => {
  describe('valid inputs', () => {
    it('should parse with required fields only', () => {
      const result: CreateEmailLogEntry = createEmailLogEntrySchema.parse({
        recipient: 'test@example.com',
        subject: 'Test',
        provider: 'smtp',
      });

      expect(result.recipient).toBe('test@example.com');
      expect(result.subject).toBe('Test');
      expect(result.provider).toBe('smtp');
      expect(result.userId).toBeUndefined();
      expect(result.templateKey).toBeUndefined();
      expect(result.status).toBeUndefined();
      expect(result.providerMessageId).toBeUndefined();
      expect(result.sentAt).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateEmailLogEntry = createEmailLogEntrySchema.parse({
        userId: VALID_UUID,
        templateKey: VALID_TEMPLATE_KEY,
        recipient: 'test@example.com',
        subject: 'Test',
        status: 'queued',
        provider: 'ses',
        providerMessageId: 'msg-456',
        sentAt: VALID_ISO,
        errorMessage: 'Failed',
        metadata: { retryCount: 1 },
      });

      expect(result.userId).toBe(VALID_UUID);
      expect(result.templateKey).toBe(VALID_TEMPLATE_KEY);
      expect(result.status).toBe('queued');
      expect(result.providerMessageId).toBe('msg-456');
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.errorMessage).toBe('Failed');
      expect(result.metadata).toEqual({ retryCount: 1 });
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateEmailLogEntry = createEmailLogEntrySchema.parse({
        userId: null,
        templateKey: null,
        recipient: 'test@example.com',
        subject: 'Test',
        provider: 'smtp',
        providerMessageId: null,
        sentAt: null,
        errorMessage: null,
      });

      expect(result.userId).toBeNull();
      expect(result.templateKey).toBeNull();
      expect(result.providerMessageId).toBeNull();
      expect(result.sentAt).toBeNull();
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing recipient', () => {
      expect(() =>
        createEmailLogEntrySchema.parse({ subject: 'Test', provider: 'smtp' }),
      ).toThrow();
    });

    it('should reject missing subject', () => {
      expect(() =>
        createEmailLogEntrySchema.parse({ recipient: 'test@example.com', provider: 'smtp' }),
      ).toThrow();
    });

    it('should reject missing provider', () => {
      expect(() =>
        createEmailLogEntrySchema.parse({ recipient: 'test@example.com', subject: 'Test' }),
      ).toThrow();
    });
  });
});
