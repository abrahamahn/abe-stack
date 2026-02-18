// main/shared/src/primitives/schema/ids.test.ts

/**
 * Adversarial tests for branded ID schemas.
 *
 * Strategy: Every UUID-based ID schema rejects the same invalid inputs —
 * verified by a shared helper. String-based IDs (PlanId, SubscriptionId,
 * EmailTemplateKey) only require min:1, so they accept any non-empty string.
 * Type-brand non-interchangeability is verified structurally (safeParse of
 * a schema does not leak one brand to another at runtime).
 */

import { describe, expect, it } from 'vitest';

import {
  activityIdSchema,
  apiKeyIdSchema,
  auditEventIdSchema,
  consentLogIdSchema,
  emailLogIdSchema,
  emailTemplateKeySchema,
  fileIdSchema,
  inviteIdSchema,
  jobIdSchema,
  legalDocumentIdSchema,
  membershipIdSchema,
  notificationIdSchema,
  organizationIdSchema,
  parseUserId,
  parsePlanId,
  parseTenantId,
  planIdSchema,
  sessionIdSchema,
  subscriptionIdSchema,
  tenantIdSchema,
  userAgreementIdSchema,
  userIdSchema,
  webhookDeliveryIdSchema,
  webhookIdSchema,
} from './ids';

// ============================================================================
// Test fixtures
// ============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_V1 = '550e8400-e29b-11d4-a716-446655440000';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// All UUID-based schemas share the same structural rules — we run the
// adversarial matrix against each one.
const UUID_SCHEMAS = [
  { name: 'userIdSchema', schema: userIdSchema, brand: 'UserId' },
  { name: 'tenantIdSchema', schema: tenantIdSchema, brand: 'TenantId' },
  { name: 'organizationIdSchema', schema: organizationIdSchema, brand: 'OrganizationId' },
  { name: 'membershipIdSchema', schema: membershipIdSchema, brand: 'MembershipId' },
  { name: 'inviteIdSchema', schema: inviteIdSchema, brand: 'InviteId' },
  { name: 'auditEventIdSchema', schema: auditEventIdSchema, brand: 'AuditEventId' },
  { name: 'activityIdSchema', schema: activityIdSchema, brand: 'ActivityId' },
  { name: 'notificationIdSchema', schema: notificationIdSchema, brand: 'NotificationId' },
  { name: 'sessionIdSchema', schema: sessionIdSchema, brand: 'SessionId' },
  { name: 'jobIdSchema', schema: jobIdSchema, brand: 'JobId' },
  { name: 'webhookIdSchema', schema: webhookIdSchema, brand: 'WebhookId' },
  { name: 'webhookDeliveryIdSchema', schema: webhookDeliveryIdSchema, brand: 'WebhookDeliveryId' },
  { name: 'apiKeyIdSchema', schema: apiKeyIdSchema, brand: 'ApiKeyId' },
  { name: 'fileIdSchema', schema: fileIdSchema, brand: 'FileId' },
  { name: 'emailLogIdSchema', schema: emailLogIdSchema, brand: 'EmailLogId' },
  { name: 'legalDocumentIdSchema', schema: legalDocumentIdSchema, brand: 'LegalDocumentId' },
  { name: 'userAgreementIdSchema', schema: userAgreementIdSchema, brand: 'UserAgreementId' },
  { name: 'consentLogIdSchema', schema: consentLogIdSchema, brand: 'ConsentLogId' },
] as const;

// ============================================================================
// Shared adversarial matrix for UUID schemas
// ============================================================================

describe.each(UUID_SCHEMAS)('$name (UUID-based)', ({ schema, brand }) => {
  describe('happy path', () => {
    it('accepts a valid v4 UUID', () => {
      expect(schema.parse(VALID_UUID)).toBe(VALID_UUID);
    });

    it('accepts a valid v1 UUID (version digit 1)', () => {
      expect(schema.parse(VALID_UUID_V1)).toBe(VALID_UUID_V1);
    });

    it('accepts a valid UUID in uppercase (case-insensitive)', () => {
      const upper = VALID_UUID.toUpperCase();
      expect(schema.parse(upper)).toBe(upper);
    });

    it('safeParse returns success:true for valid UUID', () => {
      const result = schema.safeParse(VALID_UUID);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(VALID_UUID);
    });
  });

  describe('failure — wrong type', () => {
    it('throws on null', () => {
      expect(() => schema.parse(null)).toThrow(`${brand} must be a string`);
    });

    it('throws on undefined', () => {
      expect(() => schema.parse(undefined)).toThrow(`${brand} must be a string`);
    });

    it('throws on number', () => {
      expect(() => schema.parse(42)).toThrow(`${brand} must be a string`);
    });

    it('throws on boolean', () => {
      expect(() => schema.parse(true)).toThrow(`${brand} must be a string`);
    });

    it('throws on plain object', () => {
      expect(() => schema.parse({ id: VALID_UUID })).toThrow(`${brand} must be a string`);
    });

    it('throws on array containing a valid UUID string', () => {
      expect(() => schema.parse([VALID_UUID])).toThrow(`${brand} must be a string`);
    });
  });

  describe('failure — invalid UUID string', () => {
    it('throws on empty string', () => {
      expect(() => schema.parse('')).toThrow(`${brand} must be a valid UUID`);
    });

    it('throws on nil UUID (version digit 0, rejected by regex)', () => {
      expect(() => schema.parse(NIL_UUID)).toThrow(`${brand} must be a valid UUID`);
    });

    it('throws on UUID missing hyphens', () => {
      expect(() => schema.parse('550e8400e29b41d4a716446655440000')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID that is too short', () => {
      expect(() => schema.parse('550e8400-e29b-41d4-a716')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID that is too long', () => {
      expect(() => schema.parse(`${VALID_UUID}-extra`)).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID with non-hex characters', () => {
      expect(() => schema.parse('zzzzzzzz-e29b-41d4-a716-446655440000')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID with version digit 0', () => {
      expect(() => schema.parse('550e8400-e29b-01d4-a716-446655440000')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID with version digit 6 (outside [1-5])', () => {
      expect(() => schema.parse('550e8400-e29b-61d4-a716-446655440000')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on UUID with invalid variant byte (not [89ab] at position 19)', () => {
      expect(() => schema.parse('550e8400-e29b-41d4-c716-446655440000')).toThrow(
        `${brand} must be a valid UUID`,
      );
    });

    it('throws on braced UUID format', () => {
      expect(() => schema.parse(`{${VALID_UUID}}`)).toThrow(`${brand} must be a valid UUID`);
    });

    it('safeParse returns success:false for nil UUID', () => {
      const result = schema.safeParse(NIL_UUID);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(Error);
    });

    it('safeParse never throws — always returns a result object', () => {
      const adversarialInputs = [null, undefined, '', 0, false, [], {}, NIL_UUID, 'garbage'];
      for (const input of adversarialInputs) {
        expect(() => schema.safeParse(input)).not.toThrow();
        const result = schema.safeParse(input);
        expect(typeof result.success).toBe('boolean');
      }
    });
  });
});

// ============================================================================
// String-based branded ID schemas (PlanId, SubscriptionId, EmailTemplateKey)
// ============================================================================

describe('planIdSchema (string-based)', () => {
  describe('happy path', () => {
    it('accepts a non-empty plan identifier', () => {
      expect(planIdSchema.parse('pro_monthly')).toBe('pro_monthly');
    });

    it('accepts an arbitrary non-empty string', () => {
      expect(planIdSchema.parse('enterprise_annual_v2')).toBe('enterprise_annual_v2');
    });

    it('safeParse returns success:true for valid plan ID', () => {
      const result = planIdSchema.safeParse('free');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('free');
    });
  });

  describe('failure — type violations', () => {
    it('throws on null', () => {
      expect(() => planIdSchema.parse(null)).toThrow('PlanId must be a string');
    });

    it('throws on undefined', () => {
      expect(() => planIdSchema.parse(undefined)).toThrow('PlanId must be a string');
    });

    it('throws on number', () => {
      expect(() => planIdSchema.parse(0)).toThrow('PlanId must be a string');
    });

    it('throws on object', () => {
      expect(() => planIdSchema.parse({})).toThrow('PlanId must be a string');
    });
  });

  describe('failure — empty string (min:1 default)', () => {
    it('throws on empty string', () => {
      expect(() => planIdSchema.parse('')).toThrow('PlanId must be at least 1 characters');
    });
  });
});

describe('subscriptionIdSchema (string-based)', () => {
  it('accepts a valid subscription identifier', () => {
    expect(subscriptionIdSchema.parse('sub_1234567890')).toBe('sub_1234567890');
  });

  it('throws on empty string', () => {
    expect(() => subscriptionIdSchema.parse('')).toThrow(
      'SubscriptionId must be at least 1 characters',
    );
  });

  it('throws on null', () => {
    expect(() => subscriptionIdSchema.parse(null)).toThrow('SubscriptionId must be a string');
  });
});

describe('emailTemplateKeySchema (string-based)', () => {
  it('accepts a dot-notation template key', () => {
    expect(emailTemplateKeySchema.parse('auth.welcome')).toBe('auth.welcome');
  });

  it('accepts any non-empty string', () => {
    expect(emailTemplateKeySchema.parse('notifications.digest.weekly')).toBe(
      'notifications.digest.weekly',
    );
  });

  it('throws on empty string', () => {
    expect(() => emailTemplateKeySchema.parse('')).toThrow(
      'EmailTemplateKey must be at least 1 characters',
    );
  });

  it('throws on null', () => {
    expect(() => emailTemplateKeySchema.parse(null)).toThrow(
      'EmailTemplateKey must be a string',
    );
  });
});

// ============================================================================
// Convenience parse functions
// ============================================================================

describe('parseUserId (convenience function)', () => {
  it('returns a UserId for a valid UUID string', () => {
    const result = parseUserId(VALID_UUID);
    expect(result).toBe(VALID_UUID);
  });

  it('throws for an invalid UUID string', () => {
    expect(() => parseUserId('not-a-uuid')).toThrow('UserId must be a valid UUID');
  });

  it('throws for an empty string', () => {
    expect(() => parseUserId('')).toThrow('UserId must be a valid UUID');
  });
});

describe('parseTenantId (convenience function)', () => {
  it('returns a TenantId for a valid UUID string', () => {
    expect(parseTenantId(VALID_UUID)).toBe(VALID_UUID);
  });

  it('throws for an invalid UUID string', () => {
    expect(() => parseTenantId('garbage')).toThrow('TenantId must be a valid UUID');
  });
});

describe('parsePlanId (convenience function)', () => {
  it('returns a PlanId for a non-empty string', () => {
    expect(parsePlanId('pro')).toBe('pro');
  });

  it('throws for an empty string', () => {
    expect(() => parsePlanId('')).toThrow('PlanId must be at least 1 characters');
  });
});

// ============================================================================
// Brand non-interchangeability (runtime behavior)
//
// TypeScript's type system prevents assigning a UserId to a TenantId at
// compile time. At runtime, both are plain strings — so we verify the
// runtime parse contract: each schema's parse function independently
// validates the UUID format and attaches semantics via the brand label
// in error messages. A value parsed by one schema is structurally
// identical to a value parsed by another schema at runtime (both are
// just strings) — but the type system enforces the boundary.
//
// We document this with a runtime test: a valid UUID passes both schemas
// (demonstrating no runtime cross-rejection), while an invalid value
// fails both with schema-specific error messages.
// ============================================================================

describe('brand non-interchangeability — runtime semantics', () => {
  it('a valid UUID is accepted by both userIdSchema and tenantIdSchema (structurally equivalent at runtime)', () => {
    // Both succeed for the same valid UUID — brands are type-only
    expect(userIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
    expect(tenantIdSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });

  it('each schema carries its own brand label in error messages', () => {
    // Error messages distinguish schemas by their brand name
    let userErr = '';
    let tenantErr = '';
    try {
      userIdSchema.parse(NIL_UUID);
    } catch (e) {
      if (e instanceof Error) userErr = e.message;
    }
    try {
      tenantIdSchema.parse(NIL_UUID);
    } catch (e) {
      if (e instanceof Error) tenantErr = e.message;
    }

    expect(userErr).toContain('UserId');
    expect(tenantErr).toContain('TenantId');
    // The messages differ between schemas even for the same invalid input
    expect(userErr).not.toBe(tenantErr);
  });

  it('planIdSchema accepts a value that UUID schemas would reject (non-UUID string)', () => {
    // "pro_monthly" is not a UUID — UUID schemas reject it, planIdSchema accepts it
    expect(() => userIdSchema.parse('pro_monthly')).toThrow('UserId must be a valid UUID');
    expect(planIdSchema.parse('pro_monthly')).toBe('pro_monthly');
  });

  it('UUID schema rejects what string schema accepts: empty string rejected by both', () => {
    expect(() => userIdSchema.parse('')).toThrow('UserId must be a valid UUID');
    expect(() => planIdSchema.parse('')).toThrow('PlanId must be at least 1 characters');
  });
});
