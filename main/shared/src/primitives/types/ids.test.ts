// main/shared/src/types/ids.test.ts
import { describe, expect, it } from 'vitest';

import {
  auditEventIdSchema,
  consentLogIdSchema,
  inviteIdSchema,
  jobIdSchema,
  legalDocumentIdSchema,
  membershipIdSchema,
  notificationIdSchema,
  organizationIdSchema,
  parsePlanId,
  parseTenantId,
  parseUserId,
  planIdSchema,
  sessionIdSchema,
  subscriptionIdSchema,
  tenantIdSchema,
  userAgreementIdSchema,
  userIdSchema,
  webhookDeliveryIdSchema,
  webhookIdSchema,
} from './ids';

describe('branded IDs', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const invalidUUID = 'not-a-uuid';

  // ==========================================================================
  // UUID-based ID Schemas
  // ==========================================================================
  describe('UUID-based schemas', () => {
    const uuidSchemas = [
      { name: 'userIdSchema', schema: userIdSchema },
      { name: 'tenantIdSchema', schema: tenantIdSchema },
      { name: 'organizationIdSchema', schema: organizationIdSchema },
      { name: 'membershipIdSchema', schema: membershipIdSchema },
      { name: 'inviteIdSchema', schema: inviteIdSchema },
      { name: 'auditEventIdSchema', schema: auditEventIdSchema },
      { name: 'notificationIdSchema', schema: notificationIdSchema },
      { name: 'sessionIdSchema', schema: sessionIdSchema },
      { name: 'jobIdSchema', schema: jobIdSchema },
      { name: 'webhookIdSchema', schema: webhookIdSchema },
      { name: 'webhookDeliveryIdSchema', schema: webhookDeliveryIdSchema },
      { name: 'legalDocumentIdSchema', schema: legalDocumentIdSchema },
      { name: 'userAgreementIdSchema', schema: userAgreementIdSchema },
      { name: 'consentLogIdSchema', schema: consentLogIdSchema },
    ];

    for (const { name, schema } of uuidSchemas) {
      describe(name, () => {
        it('accepts valid UUID', () => {
          expect(() => schema.parse(validUUID)).not.toThrow();
        });

        it('rejects invalid UUID', () => {
          expect(() => schema.parse(invalidUUID)).toThrow();
        });

        it('rejects empty string', () => {
          expect(() => schema.parse('')).toThrow();
        });

        it('rejects non-string values', () => {
          expect(() => schema.parse(123)).toThrow();
          expect(() => schema.parse(null)).toThrow();
        });
      });
    }
  });

  // ==========================================================================
  // String-based ID Schemas
  // ==========================================================================
  describe('string-based schemas', () => {
    describe('planIdSchema', () => {
      it('accepts non-empty strings', () => {
        expect(() => planIdSchema.parse('pro_monthly')).not.toThrow();
        expect(() => planIdSchema.parse('plan_1')).not.toThrow();
      });

      it('rejects empty string', () => {
        expect(() => planIdSchema.parse('')).toThrow();
      });
    });

    describe('subscriptionIdSchema', () => {
      it('accepts non-empty strings', () => {
        expect(() => subscriptionIdSchema.parse('sub_123')).not.toThrow();
      });

      it('rejects empty string', () => {
        expect(() => subscriptionIdSchema.parse('')).toThrow();
      });
    });
  });

  // ==========================================================================
  // Parse Helpers
  // ==========================================================================
  describe('parseUserId', () => {
    it('parses valid UUID and returns branded type', () => {
      const id = parseUserId(validUUID);
      expect(id).toBe(validUUID);
    });

    it('throws for invalid UUID', () => {
      expect(() => parseUserId(invalidUUID)).toThrow();
    });
  });

  describe('parseTenantId', () => {
    it('parses valid UUID and returns branded type', () => {
      const id = parseTenantId(validUUID);
      expect(id).toBe(validUUID);
    });

    it('throws for invalid UUID', () => {
      expect(() => parseTenantId(invalidUUID)).toThrow();
    });
  });

  describe('parsePlanId', () => {
    it('parses valid plan ID', () => {
      const id = parsePlanId('pro_monthly');
      expect(id).toBe('pro_monthly');
    });

    it('throws for empty string', () => {
      expect(() => parsePlanId('')).toThrow();
    });
  });
});
