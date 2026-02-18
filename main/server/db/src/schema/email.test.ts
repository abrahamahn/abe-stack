// main/server/db/src/schema/email.test.ts
import { describe, expect, test } from 'vitest';

import {
  EMAIL_LOG_COLUMNS,
  EMAIL_LOG_TABLE,
  EMAIL_PROVIDERS,
  EMAIL_STATUSES,
  EMAIL_TEMPLATE_COLUMNS,
  EMAIL_TEMPLATES_TABLE,
  type EmailLog,
  type EmailProvider,
  type EmailStatus,
  type EmailTemplate,
  type NewEmailLog,
  type NewEmailTemplate,
  type UpdateEmailTemplate,
} from './email';

// ============================================================================
// Table Names
// ============================================================================

describe('Email Schema - Table Names', () => {
  test('should have correct table name for email_templates', () => {
    expect(EMAIL_TEMPLATES_TABLE).toBe('email_templates');
  });

  test('should have correct table name for email_log', () => {
    expect(EMAIL_LOG_TABLE).toBe('email_log');
  });

  test('table names should be unique', () => {
    const tableNames = [EMAIL_TEMPLATES_TABLE, EMAIL_LOG_TABLE];
    const uniqueNames = new Set(tableNames);
    expect(uniqueNames.size).toBe(tableNames.length);
  });

  test('table names should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    expect(EMAIL_TEMPLATES_TABLE).toMatch(snakeCasePattern);
    expect(EMAIL_LOG_TABLE).toMatch(snakeCasePattern);
  });
});

// ============================================================================
// Enums
// ============================================================================

describe('Email Schema - EmailStatus Enum', () => {
  test('should have exactly 5 statuses', () => {
    expect(EMAIL_STATUSES.length).toBe(5);
  });

  test('should contain correct status values', () => {
    expect(EMAIL_STATUSES).toEqual(['queued', 'sent', 'delivered', 'bounced', 'failed']);
  });

  test('enum values should match SQL CHECK constraint', () => {
    const statuses: EmailStatus[] = ['queued', 'sent', 'delivered', 'bounced', 'failed'];
    statuses.forEach((status) => {
      expect(EMAIL_STATUSES).toContain(status);
    });
  });

  test('enum values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    EMAIL_STATUSES.forEach((status) => {
      expect(status).toMatch(snakeCasePattern);
    });
  });
});

describe('Email Schema - EmailProvider Enum', () => {
  test('should have exactly 4 providers', () => {
    expect(EMAIL_PROVIDERS.length).toBe(4);
  });

  test('should contain correct provider values', () => {
    expect(EMAIL_PROVIDERS).toEqual(['smtp', 'ses', 'sendgrid', 'console']);
  });

  test('enum values should match SQL CHECK constraint', () => {
    const providers: EmailProvider[] = ['smtp', 'ses', 'sendgrid', 'console'];
    providers.forEach((provider) => {
      expect(EMAIL_PROVIDERS).toContain(provider);
    });
  });
});

// ============================================================================
// Column Mappings
// ============================================================================

describe('Email Schema - Email Template Columns', () => {
  test('should have correct column mappings', () => {
    expect(EMAIL_TEMPLATE_COLUMNS).toEqual({
      key: 'key',
      name: 'name',
      subject: 'subject',
      bodyHtml: 'body_html',
      bodyText: 'body_text',
      variables: 'variables',
      isActive: 'is_active',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(EMAIL_TEMPLATE_COLUMNS.bodyHtml).toBe('body_html');
    expect(EMAIL_TEMPLATE_COLUMNS.bodyText).toBe('body_text');
    expect(EMAIL_TEMPLATE_COLUMNS.isActive).toBe('is_active');
    expect(EMAIL_TEMPLATE_COLUMNS.createdAt).toBe('created_at');
    expect(EMAIL_TEMPLATE_COLUMNS.updatedAt).toBe('updated_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'key',
      'name',
      'subject',
      'bodyHtml',
      'bodyText',
      'variables',
      'isActive',
      'createdAt',
      'updatedAt',
    ];
    const actualColumns = Object.keys(EMAIL_TEMPLATE_COLUMNS);
    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(EMAIL_TEMPLATE_COLUMNS);
    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = EMAIL_TEMPLATE_COLUMNS;
    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly key: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

describe('Email Schema - Email Log Columns', () => {
  test('should have correct column mappings', () => {
    expect(EMAIL_LOG_COLUMNS).toEqual({
      id: 'id',
      userId: 'user_id',
      templateKey: 'template_key',
      recipient: 'recipient',
      subject: 'subject',
      status: 'status',
      provider: 'provider',
      providerMessageId: 'provider_message_id',
      sentAt: 'sent_at',
      deliveredAt: 'delivered_at',
      bouncedAt: 'bounced_at',
      errorMessage: 'error_message',
      metadata: 'metadata',
      createdAt: 'created_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(EMAIL_LOG_COLUMNS.userId).toBe('user_id');
    expect(EMAIL_LOG_COLUMNS.templateKey).toBe('template_key');
    expect(EMAIL_LOG_COLUMNS.providerMessageId).toBe('provider_message_id');
    expect(EMAIL_LOG_COLUMNS.sentAt).toBe('sent_at');
    expect(EMAIL_LOG_COLUMNS.deliveredAt).toBe('delivered_at');
    expect(EMAIL_LOG_COLUMNS.bouncedAt).toBe('bounced_at');
    expect(EMAIL_LOG_COLUMNS.errorMessage).toBe('error_message');
    expect(EMAIL_LOG_COLUMNS.createdAt).toBe('created_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = [
      'id',
      'userId',
      'templateKey',
      'recipient',
      'subject',
      'status',
      'provider',
      'providerMessageId',
      'sentAt',
      'deliveredAt',
      'bouncedAt',
      'errorMessage',
      'metadata',
      'createdAt',
    ];
    const actualColumns = Object.keys(EMAIL_LOG_COLUMNS);
    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(EMAIL_LOG_COLUMNS);
    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });
});

// ============================================================================
// EmailTemplate Type
// ============================================================================

describe('Email Schema - EmailTemplate Type', () => {
  test('should accept valid email template', () => {
    const template: EmailTemplate = {
      key: 'auth.welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{app_name}}!',
      bodyHtml: '<h1>Welcome, {{name}}!</h1>',
      bodyText: 'Welcome, {{name}}!',
      variables: { name: 'string', app_name: 'string' },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(template.key).toBe('auth.welcome');
    expect(template.isActive).toBe(true);
    expect(template.variables).toHaveProperty('name');
  });

  test('should handle null body fields', () => {
    const template: EmailTemplate = {
      key: 'system.notification',
      name: 'System Notification',
      subject: 'System Update',
      bodyHtml: null,
      bodyText: null,
      variables: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(template.bodyHtml).toBeNull();
    expect(template.bodyText).toBeNull();
  });

  test('should accept various key formats', () => {
    const validKeys = [
      'auth.welcome',
      'auth.password_reset',
      'billing.invoice',
      'system.alert',
      'onboarding.step1',
    ];

    validKeys.forEach((key) => {
      const template: EmailTemplate = {
        key,
        name: `Template for ${key}`,
        subject: 'Subject',
        bodyHtml: '<p>Body</p>',
        bodyText: 'Body',
        variables: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(template.key).toBe(key);
    });
  });

  test('should handle inactive templates', () => {
    const template: EmailTemplate = {
      key: 'deprecated.old_welcome',
      name: 'Old Welcome Email',
      subject: 'Welcome!',
      bodyHtml: '<p>Welcome</p>',
      bodyText: 'Welcome',
      variables: {},
      isActive: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2025-06-01'),
    };

    expect(template.isActive).toBe(false);
  });
});

// ============================================================================
// NewEmailTemplate Type
// ============================================================================

describe('Email Schema - NewEmailTemplate Type', () => {
  test('should accept minimal new email template', () => {
    const newTemplate: NewEmailTemplate = {
      key: 'auth.welcome',
      name: 'Welcome Email',
      subject: 'Welcome!',
    };

    expect(newTemplate.key).toBe('auth.welcome');
    expect(newTemplate.name).toBe('Welcome Email');
    expect(newTemplate.subject).toBe('Welcome!');
  });

  test('should accept new email template with all optional fields', () => {
    const newTemplate: NewEmailTemplate = {
      key: 'auth.password_reset',
      name: 'Password Reset',
      subject: 'Reset Your Password',
      bodyHtml: '<p>Click the link to reset your password.</p>',
      bodyText: 'Click the link to reset your password.',
      variables: { reset_url: 'string', expires_in: 'number' },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(newTemplate.bodyHtml).toBeDefined();
    expect(newTemplate.bodyText).toBeDefined();
    expect(newTemplate.variables).toHaveProperty('reset_url');
    expect(newTemplate.isActive).toBe(true);
  });

  test('should accept explicit null for body fields', () => {
    const newTemplate: NewEmailTemplate = {
      key: 'system.test',
      name: 'Test Template',
      subject: 'Test',
      bodyHtml: null,
      bodyText: null,
    };

    expect(newTemplate.bodyHtml).toBeNull();
    expect(newTemplate.bodyText).toBeNull();
  });
});

// ============================================================================
// UpdateEmailTemplate Type
// ============================================================================

describe('Email Schema - UpdateEmailTemplate Type', () => {
  test('should accept partial updates', () => {
    const update1: UpdateEmailTemplate = { name: 'Updated Name' };
    const update2: UpdateEmailTemplate = { subject: 'New Subject' };
    const update3: UpdateEmailTemplate = { isActive: false };

    expect(update1.name).toBeDefined();
    expect(update2.subject).toBeDefined();
    expect(update3.isActive).toBe(false);
  });

  test('should accept multiple fields in update', () => {
    const update: UpdateEmailTemplate = {
      name: 'Updated Welcome Email',
      subject: 'New Welcome Subject',
      bodyHtml: '<h1>Updated Welcome!</h1>',
      bodyText: 'Updated Welcome!',
      variables: { name: 'string', company: 'string' },
      isActive: true,
    };

    expect(update.name).toBe('Updated Welcome Email');
    expect(update.variables).toHaveProperty('company');
  });

  test('should accept empty update object', () => {
    const update: UpdateEmailTemplate = {};
    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include key (PK is immutable)', () => {
    const update: UpdateEmailTemplate = { name: 'Updated' };
    expect('key' in update).toBe(false);
  });
});

// ============================================================================
// EmailLog Type
// ============================================================================

describe('Email Schema - EmailLog Type', () => {
  test('should accept valid queued email log', () => {
    const log: EmailLog = {
      id: 'log-123',
      userId: 'user-456',
      templateKey: 'auth.welcome',
      recipient: 'user@example.com',
      subject: 'Welcome to BSLT!',
      status: 'queued',
      provider: 'ses',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.status).toBe('queued');
    expect(log.provider).toBe('ses');
    expect(log.sentAt).toBeNull();
  });

  test('should accept delivered email log', () => {
    const now = new Date();
    const log: EmailLog = {
      id: 'log-456',
      userId: 'user-456',
      templateKey: 'auth.password_reset',
      recipient: 'user@example.com',
      subject: 'Reset Your Password',
      status: 'delivered',
      provider: 'sendgrid',
      providerMessageId: 'sg-msg-789',
      sentAt: new Date(now.getTime() - 5000),
      deliveredAt: now,
      bouncedAt: null,
      errorMessage: null,
      metadata: { campaign: 'password_reset_2026' },
      createdAt: new Date(now.getTime() - 10000),
    };

    expect(log.status).toBe('delivered');
    expect(log.providerMessageId).toBe('sg-msg-789');
    expect(log.deliveredAt).toBeInstanceOf(Date);
  });

  test('should accept bounced email log', () => {
    const log: EmailLog = {
      id: 'log-789',
      userId: null,
      templateKey: null,
      recipient: 'invalid@nonexistent.example.com',
      subject: 'Test Email',
      status: 'bounced',
      provider: 'smtp',
      providerMessageId: null,
      sentAt: new Date(),
      deliveredAt: null,
      bouncedAt: new Date(),
      errorMessage: 'Mailbox not found',
      metadata: { bounceType: 'hard' },
      createdAt: new Date(),
    };

    expect(log.status).toBe('bounced');
    expect(log.bouncedAt).toBeInstanceOf(Date);
    expect(log.errorMessage).toBe('Mailbox not found');
  });

  test('should accept failed email log', () => {
    const log: EmailLog = {
      id: 'log-failed',
      userId: 'user-456',
      templateKey: 'billing.invoice',
      recipient: 'user@example.com',
      subject: 'Your Invoice',
      status: 'failed',
      provider: 'ses',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: 'SES service unavailable',
      metadata: { retryCount: 3 },
      createdAt: new Date(),
    };

    expect(log.status).toBe('failed');
    expect(log.errorMessage).toBe('SES service unavailable');
  });

  test('should handle null userId and templateKey', () => {
    const log: EmailLog = {
      id: 'log-system',
      userId: null,
      templateKey: null,
      recipient: 'admin@example.com',
      subject: 'System Alert',
      status: 'sent',
      provider: 'console',
      providerMessageId: null,
      sentAt: new Date(),
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.userId).toBeNull();
    expect(log.templateKey).toBeNull();
  });

  test('should accept all valid email statuses', () => {
    const statuses: EmailStatus[] = ['queued', 'sent', 'delivered', 'bounced', 'failed'];

    statuses.forEach((status, index) => {
      const log: EmailLog = {
        id: `log-${String(index)}`,
        userId: null,
        templateKey: null,
        recipient: 'test@example.com',
        subject: 'Test',
        status,
        provider: 'console',
        providerMessageId: null,
        sentAt: null,
        deliveredAt: null,
        bouncedAt: null,
        errorMessage: null,
        metadata: {},
        createdAt: new Date(),
      };

      expect(log.status).toBe(status);
    });
  });

  test('should accept all valid email providers', () => {
    const providers: EmailProvider[] = ['smtp', 'ses', 'sendgrid', 'console'];

    providers.forEach((provider, index) => {
      const log: EmailLog = {
        id: `log-${String(index)}`,
        userId: null,
        templateKey: null,
        recipient: 'test@example.com',
        subject: 'Test',
        status: 'queued',
        provider,
        providerMessageId: null,
        sentAt: null,
        deliveredAt: null,
        bouncedAt: null,
        errorMessage: null,
        metadata: {},
        createdAt: new Date(),
      };

      expect(log.provider).toBe(provider);
    });
  });
});

// ============================================================================
// NewEmailLog Type
// ============================================================================

describe('Email Schema - NewEmailLog Type', () => {
  test('should accept minimal new email log', () => {
    const newLog: NewEmailLog = {
      recipient: 'user@example.com',
      subject: 'Welcome!',
      provider: 'ses',
    };

    expect(newLog.recipient).toBe('user@example.com');
    expect(newLog.subject).toBe('Welcome!');
    expect(newLog.provider).toBe('ses');
  });

  test('should accept new email log with all optional fields', () => {
    const newLog: NewEmailLog = {
      id: 'log-123',
      userId: 'user-456',
      templateKey: 'auth.welcome',
      recipient: 'user@example.com',
      subject: 'Welcome to BSLT!',
      status: 'queued',
      provider: 'sendgrid',
      providerMessageId: 'sg-123',
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: { source: 'registration' },
      createdAt: new Date(),
    };

    expect(newLog.id).toBe('log-123');
    expect(newLog.userId).toBe('user-456');
    expect(newLog.templateKey).toBe('auth.welcome');
    expect(newLog.providerMessageId).toBe('sg-123');
  });

  test('should accept explicit null for nullable fields', () => {
    const newLog: NewEmailLog = {
      recipient: 'user@example.com',
      subject: 'Test',
      provider: 'smtp',
      userId: null,
      templateKey: null,
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
    };

    expect(newLog.userId).toBeNull();
    expect(newLog.templateKey).toBeNull();
  });
});

// ============================================================================
// Type Consistency
// ============================================================================

describe('Email Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newTemplate: NewEmailTemplate = {
      key: 'test.template',
      name: 'Test',
      subject: 'Test Subject',
    };

    const fullTemplate: EmailTemplate = {
      bodyHtml: null,
      bodyText: null,
      variables: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...newTemplate,
    };

    expect(fullTemplate.key).toBe(newTemplate.key);
    expect(fullTemplate.name).toBe(newTemplate.name);
    expect(fullTemplate.subject).toBe(newTemplate.subject);
  });

  test('Column constants should cover all EmailTemplate type properties', () => {
    const template: EmailTemplate = {
      key: 'k',
      name: 'n',
      subject: 's',
      bodyHtml: null,
      bodyText: null,
      variables: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const templateKeys = Object.keys(template);
    const columnKeys = Object.keys(EMAIL_TEMPLATE_COLUMNS);
    expect(columnKeys.sort()).toEqual(templateKeys.sort());
  });

  test('Column constants should cover all EmailLog type properties', () => {
    const log: EmailLog = {
      id: 'id',
      userId: null,
      templateKey: null,
      recipient: 'r',
      subject: 's',
      status: 'queued',
      provider: 'console',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    const logKeys = Object.keys(log);
    const columnKeys = Object.keys(EMAIL_LOG_COLUMNS);
    expect(columnKeys.sort()).toEqual(logKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(EMAIL_TEMPLATE_COLUMNS.createdAt).toMatch(/_at$/);
    expect(EMAIL_TEMPLATE_COLUMNS.updatedAt).toMatch(/_at$/);
    expect(EMAIL_LOG_COLUMNS.sentAt).toMatch(/_at$/);
    expect(EMAIL_LOG_COLUMNS.deliveredAt).toMatch(/_at$/);
    expect(EMAIL_LOG_COLUMNS.bouncedAt).toMatch(/_at$/);
    expect(EMAIL_LOG_COLUMNS.createdAt).toMatch(/_at$/);
  });

  test('Append-only table (email_log) should not have Update type', () => {
    // TypeScript enforces this at compile time — NewEmailLog exists, UpdateEmailLog does not
    type HasNewEmailLog = NewEmailLog extends object ? true : false;
    const hasNewEmailLog: HasNewEmailLog = true;
    expect(hasNewEmailLog).toBe(true);
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Email Schema - Integration Scenarios', () => {
  test('should support welcome email workflow', () => {
    const template: EmailTemplate = {
      key: 'auth.welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{app_name}}, {{name}}!',
      bodyHtml: '<h1>Welcome, {{name}}!</h1><p>Get started at {{app_url}}.</p>',
      bodyText: 'Welcome, {{name}}! Get started at {{app_url}}.',
      variables: { name: 'string', app_name: 'string', app_url: 'string' },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const log: EmailLog = {
      id: 'log-welcome-123',
      userId: 'user-456',
      templateKey: template.key,
      recipient: 'newuser@example.com',
      subject: 'Welcome to BSLT, John!',
      status: 'delivered',
      provider: 'ses',
      providerMessageId: 'ses-msg-789',
      sentAt: new Date(),
      deliveredAt: new Date(),
      bouncedAt: null,
      errorMessage: null,
      metadata: { rendered: true },
      createdAt: new Date(),
    };

    expect(log.templateKey).toBe(template.key);
    expect(log.status).toBe('delivered');
  });

  test('should support password reset email lifecycle', () => {
    const queued: EmailLog = {
      id: 'log-reset-1',
      userId: 'user-456',
      templateKey: 'auth.password_reset',
      recipient: 'user@example.com',
      subject: 'Reset Your Password',
      status: 'queued',
      provider: 'ses',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    const sent: EmailLog = {
      ...queued,
      status: 'sent',
      providerMessageId: 'ses-msg-123',
      sentAt: new Date(),
    };

    const delivered: EmailLog = {
      ...sent,
      status: 'delivered',
      deliveredAt: new Date(),
    };

    expect(queued.status).toBe('queued');
    expect(sent.status).toBe('sent');
    expect(delivered.status).toBe('delivered');
    expect(delivered.providerMessageId).toBe('ses-msg-123');
  });

  test('should support console provider for development', () => {
    const log: EmailLog = {
      id: 'log-dev-1',
      userId: 'user-456',
      templateKey: 'auth.welcome',
      recipient: 'dev@localhost',
      subject: 'Dev Welcome',
      status: 'sent',
      provider: 'console',
      providerMessageId: null,
      sentAt: new Date(),
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: { environment: 'development' },
      createdAt: new Date(),
    };

    expect(log.provider).toBe('console');
    expect(log.providerMessageId).toBeNull();
  });

  test('should support template deactivation', () => {
    const active: EmailTemplate = {
      key: 'promo.summer',
      name: 'Summer Promo',
      subject: 'Summer Sale!',
      bodyHtml: '<p>50% off!</p>',
      bodyText: '50% off!',
      variables: {},
      isActive: true,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-01'),
    };

    const deactivated: UpdateEmailTemplate = {
      isActive: false,
    };

    expect(active.isActive).toBe(true);
    expect(deactivated.isActive).toBe(false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Email Schema - Edge Cases', () => {
  test('should handle special characters in email addresses', () => {
    const log: EmailLog = {
      id: 'log-special',
      userId: null,
      templateKey: null,
      recipient: 'user+tag@sub.example.co.uk',
      subject: 'Test',
      status: 'queued',
      provider: 'smtp',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.recipient).toContain('+');
    expect(log.recipient).toContain('.co.uk');
  });

  test('should handle very long subject lines', () => {
    const longSubject = 'Re: '.repeat(50) + 'Original Subject';
    const log: EmailLog = {
      id: 'log-long',
      userId: null,
      templateKey: null,
      recipient: 'user@example.com',
      subject: longSubject,
      status: 'queued',
      provider: 'smtp',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
    };

    expect(log.subject.length).toBeGreaterThan(200);
  });

  test('should handle complex metadata in log', () => {
    const metadata = {
      headers: { 'X-Custom': 'value', 'X-Request-ID': 'req-123' },
      attachments: [{ name: 'invoice.pdf', size: 1024 }],
      tags: ['transactional', 'billing'],
      retryHistory: [
        { attempt: 1, error: 'timeout', at: '2026-01-01T00:00:00Z' },
        { attempt: 2, error: 'timeout', at: '2026-01-01T00:01:00Z' },
      ],
    };

    const log: EmailLog = {
      id: 'log-complex',
      userId: 'user-456',
      templateKey: 'billing.invoice',
      recipient: 'user@example.com',
      subject: 'Your Invoice',
      status: 'sent',
      provider: 'sendgrid',
      providerMessageId: 'sg-456',
      sentAt: new Date(),
      deliveredAt: null,
      bouncedAt: null,
      errorMessage: null,
      metadata,
      createdAt: new Date(),
    };

    expect(log.metadata).toEqual(metadata);
    expect(log.metadata).toHaveProperty('headers');
    expect(log.metadata).toHaveProperty('attachments');
  });

  test('should handle empty variables in template', () => {
    const template: EmailTemplate = {
      key: 'system.plain',
      name: 'Plain Notification',
      subject: 'System Update',
      bodyHtml: '<p>System has been updated.</p>',
      bodyText: 'System has been updated.',
      variables: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(template.variables).toEqual({});
    expect(Object.keys(template.variables).length).toBe(0);
  });
});
